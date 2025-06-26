#!/usr/bin/env node

/**
 * End-to-End Test: Complete Workflow from Prompt to Database
 * 
 * This test verifies the entire feature request tracking pipeline:
 * 1. User sends a Twitter analysis request
 * 2. Agent fetches Twitter replies
 * 3. Agent detects feature requests in replies
 * 4. Agent automatically saves features to database
 * 5. Database is updated with proper attribution
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Test data - simulating the real Twitter URL that has replies
const TEST_TWEET_URL = 'https://x.com/meetnpay/status/1937766635554976060';
const TEST_SESSION_ID = 'e2e-test-session-' + Date.now();

console.log('🧪 End-to-End Test: Prompt → Agent → Database');
console.log('==============================================\n');

async function runEndToEndTest() {
  let testResults = {
    healthCheck: false,
    agentResponse: false,
    featureDetection: false,
    databaseUpdate: false,
    dataIntegrity: false
  };

  try {
    console.log('📋 Test Overview:');
    console.log('1. Health check');
    console.log('2. Send Twitter analysis request to agent');
    console.log('3. Verify agent detects feature requests');
    console.log('4. Check database for saved features');
    console.log('5. Validate data integrity\n');

    // Step 1: Health Check
    console.log('🔍 Step 1: Health Check');
    console.log('=======================');
    await testHealthCheck();
    testResults.healthCheck = true;
    console.log('✅ Health check passed\n');

    // Step 2: Agent Analysis Request
    console.log('🤖 Step 2: Agent Twitter Analysis');
    console.log('=================================');
    const agentResponse = await testAgentAnalysis();
    testResults.agentResponse = true;
    console.log('✅ Agent response received\n');

    // Step 3: Feature Detection Verification
    console.log('🎯 Step 3: Feature Detection Verification');
    console.log('=========================================');
    const detectedFeatures = await verifyFeatureDetection(agentResponse);
    testResults.featureDetection = detectedFeatures.length > 0;
    console.log(`✅ Detected ${detectedFeatures.length} features\n`);

    // Step 4: Database Update Verification
    console.log('💾 Step 4: Database Update Verification');
    console.log('=======================================');
    const savedFeatures = await verifyDatabaseUpdate();
    testResults.databaseUpdate = savedFeatures.length > 0;
    console.log(`✅ Found ${savedFeatures.length} features in database\n`);

    // Step 5: Data Integrity Check
    console.log('🔐 Step 5: Data Integrity Check');
    console.log('===============================');
    await verifyDataIntegrity(savedFeatures);
    testResults.dataIntegrity = true;
    console.log('✅ Data integrity verified\n');

    // Final Results
    console.log('📊 Test Results Summary:');
    console.log('========================');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(testResults).every(result => result);
    console.log(`\n🎉 Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🚀 End-to-End Workflow is Working Perfectly!');
      console.log('The complete pipeline from user prompt to database update is functional.');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ End-to-End Test Failed:', error.message);
    console.log('\n📋 Test Results Summary:');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    return false;
  }
}

// Step 1: Health Check
async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status !== 200 || response.data.status !== 'OK') {
      throw new Error('Health check failed');
    }
    
    console.log('   Server is healthy and running');
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
}

// Step 2: Agent Analysis Request
async function testAgentAnalysis() {
  try {
    console.log(`   Sending request: "What are people saying about this tweet: ${TEST_TWEET_URL}"`);
    
    const response = await axios.post(`${API_URL}/agent/chat`, {
      message: `What are people saying about this tweet: ${TEST_TWEET_URL}`,
      sessionId: TEST_SESSION_ID
    });

    if (!response.data.success) {
      throw new Error(`Agent request failed: ${response.data.error}`);
    }

    console.log('   🤖 Agent Response:', response.data.data.response.substring(0, 200) + '...');
    console.log('   ⏱️ Processing Time:', response.data.data.processingTime);
    console.log('   🔧 Tools Used:', JSON.stringify(response.data.data.toolsUsed));

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }
    throw new Error(`Agent analysis failed: ${error.response?.data?.error || error.message}`);
  }
}

// Step 3: Feature Detection Verification
async function verifyFeatureDetection(agentResponse) {
  const detectedFeatures = [];
  const responseText = agentResponse.response.toLowerCase();
  
  // Check for common feature requests that should be detected
  const expectedFeatures = [
    { name: 'dark mode', keywords: ['dark', 'mode', 'theme'] },
    { name: 'responsive design', keywords: ['responsive', 'mobile', 'device'] },
    { name: 'notifications', keywords: ['notification', 'alert', 'notify'] }
  ];

  expectedFeatures.forEach(feature => {
    const detected = feature.keywords.some(keyword => responseText.includes(keyword));
    if (detected) {
      detectedFeatures.push(feature.name);
      console.log(`   🎯 Detected feature: ${feature.name}`);
    }
  });

  // Check if agent mentioned saving to database
  const mentionedSaving = responseText.includes('saved') || 
                         responseText.includes('database') || 
                         responseText.includes('tracked');
  
  if (mentionedSaving) {
    console.log('   💾 Agent mentioned saving features to database');
  }

  return detectedFeatures;
}

// Step 4: Database Update Verification
async function verifyDatabaseUpdate() {
  try {
    // Check if features were saved for the target account
    const response = await axios.get(`${API_URL}/features?target_account=meetnpay&limit=10`);
    
    if (response.status === 503) {
      console.log('   ⚠️ Supabase not configured - database verification skipped');
      return [];
    }

    if (!response.data.success) {
      throw new Error('Failed to fetch features from database');
    }

    const features = response.data.data.features;
    console.log(`   📊 Found ${features.length} features in database for account: meetnpay`);
    
    // Show recent features
    features.slice(0, 3).forEach(feature => {
      console.log(`   📝 Feature: ${feature.feature_name} (${feature.status}) - requested by ${feature.requested_by_username}`);
    });

    return features;
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('   ⚠️ Supabase not configured - database verification skipped');
      return [];
    }
    throw new Error(`Database verification failed: ${error.message}`);
  }
}

// Step 5: Data Integrity Check
async function verifyDataIntegrity(savedFeatures) {
  if (savedFeatures.length === 0) {
    console.log('   ⚠️ No features to verify - Supabase not configured');
    return;
  }

  // Check required fields
  const requiredFields = ['id', 'feature_name', 'target_account', 'requested_by_username', 'status', 'created_at'];
  
  savedFeatures.forEach((feature, index) => {
    const missingFields = requiredFields.filter(field => !feature[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Feature ${index + 1} missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate status values
    const validStatuses = ['requested', 'developing', 'pr_raised', 'shipped'];
    if (!validStatuses.includes(feature.status)) {
      throw new Error(`Feature ${index + 1} has invalid status: ${feature.status}`);
    }
    
    // Validate feature name format
    if (typeof feature.feature_name !== 'string' || feature.feature_name.trim().length === 0) {
      throw new Error(`Feature ${index + 1} has invalid feature name`);
    }
  });

  console.log('   🔐 All required fields present');
  console.log('   ✅ Status values are valid');
  console.log('   📝 Feature names are properly formatted');
}

// Additional Test: Direct Feature Request Tool Test
async function testDirectFeatureRequestTool() {
  console.log('\n🔧 Bonus Test: Direct Feature Request Tool');
  console.log('==========================================');
  
  const testFeatureData = {
    features: [
      {
        name: 'test feature from e2e',
        description: 'This is a test feature created during end-to-end testing',
        category: 'ui',
        priority: 'medium'
      }
    ],
    tweetUrl: TEST_TWEET_URL,
    targetAccount: 'meetnpay',
    replies: [
      {
        username: 'e2e_tester',
        text: '@meetnpay test feature from e2e'
      }
    ]
  };

  try {
    const response = await axios.post(`${API_URL}/agent/chat`, {
      message: `Please save this feature request: ${JSON.stringify(testFeatureData)}`,
      sessionId: TEST_SESSION_ID + '_direct'
    });

    if (response.data.success) {
      console.log('✅ Direct feature request tool test passed');
      console.log('   🤖 Agent Response:', response.data.data.response.substring(0, 150) + '...');
    }
  } catch (error) {
    console.log('⚠️ Direct feature request tool test skipped:', error.response?.data?.error || error.message);
  }
}

// Performance Test
async function testPerformance() {
  console.log('\n⚡ Performance Test');
  console.log('==================');
  
  const startTime = Date.now();
  
  try {
    await axios.post(`${API_URL}/agent/chat`, {
      message: 'Quick test message',
      sessionId: 'perf-test-' + Date.now()
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ Response time: ${duration}ms`);
    
    if (duration < 5000) {
      console.log('✅ Performance is acceptable (< 5 seconds)');
    } else {
      console.log('⚠️ Performance is slow (> 5 seconds)');
    }
  } catch (error) {
    console.log('⚠️ Performance test skipped:', error.message);
  }
}

// Run the complete test suite
if (require.main === module) {
  runEndToEndTest()
    .then(async (success) => {
      if (success) {
        await testDirectFeatureRequestTool();
        await testPerformance();
      }
      
      console.log('\n🏁 End-to-End Testing Complete!');
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runEndToEndTest,
  testDirectFeatureRequestTool,
  testPerformance
}; 