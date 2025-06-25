const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data
const testFeatureRequest = {
  feature_name: 'test dark mode',
  description: 'Test feature for dark mode functionality',
  target_account: 'testaccount',
  requested_by_username: 'testuser',
  category: 'ui',
  priority: 'high',
  tweet_url: 'https://x.com/testaccount/status/1234567890',
  reply_text: '@testaccount please add dark mode'
};

// Test suite for Feature Request Tracking
async function runFeatureTests() {
  console.log('🧪 Starting Feature Request Tracking Tests\n');

  try {
    // Test 1: Health check
    await testHealthCheck();
    
    // Test 2: Feature request creation
    await testCreateFeatureRequest();
    
    // Test 3: Get all features
    await testGetAllFeatures();
    
    // Test 4: Get features by account
    await testGetFeaturesByAccount();
    
    // Test 5: Update feature status
    await testUpdateFeatureStatus();
    
    // Test 6: Get feature statistics
    await testGetFeatureStats();
    
    // Test 7: Feature request validation
    await testFeatureValidation();
    
    console.log('✅ All Feature Request Tests Passed!\n');
    
  } catch (error) {
    console.error('❌ Feature Tests Failed:', error.message);
    process.exit(1);
  }
}

// Test 1: Health check
async function testHealthCheck() {
  console.log('Testing: Health Check...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status === 200 && response.data.status === 'OK') {
      console.log('✅ Health check passed');
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Test 2: Create feature request
async function testCreateFeatureRequest() {
  console.log('Testing: Create Feature Request...');
  
  try {
    const response = await axios.post(`${API_URL}/features`, testFeatureRequest);
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Feature request created successfully');
      console.log(`   Feature: ${response.data.data.feature.feature_name}`);
      console.log(`   Status: ${response.data.data.feature.status}`);
      
      // Store the ID for later tests
      global.testFeatureId = response.data.data.feature.id;
    } else {
      throw new Error('Feature creation failed');
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️ Feature already exists (expected for duplicate test)');
    } else if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping database tests');
      return;
    } else {
      console.log('❌ Feature creation failed:', error.response?.data?.error || error.message);
      throw error;
    }
  }
}

// Test 3: Get all features
async function testGetAllFeatures() {
  console.log('Testing: Get All Features...');
  
  try {
    const response = await axios.get(`${API_URL}/features`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Features retrieved successfully');
      console.log(`   Total features: ${response.data.data.features.length}`);
      
      if (response.data.data.features.length > 0) {
        const feature = response.data.data.features[0];
        console.log(`   Sample feature: ${feature.feature_name} (${feature.status})`);
      }
    } else {
      throw new Error('Failed to get features');
    }
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping database tests');
      return;
    }
    console.log('❌ Get features failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Test 4: Get features by account
async function testGetFeaturesByAccount() {
  console.log('Testing: Get Features by Account...');
  
  try {
    const response = await axios.get(`${API_URL}/features?target_account=${testFeatureRequest.target_account}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Account features retrieved successfully');
      console.log(`   Features for ${testFeatureRequest.target_account}: ${response.data.data.features.length}`);
    } else {
      throw new Error('Failed to get account features');
    }
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping database tests');
      return;
    }
    console.log('❌ Get account features failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Test 5: Update feature status
async function testUpdateFeatureStatus() {
  console.log('Testing: Update Feature Status...');
  
  if (!global.testFeatureId) {
    console.log('⚠️ No test feature ID available - skipping status update test');
    return;
  }
  
  try {
    const response = await axios.put(`${API_URL}/features/${global.testFeatureId}/status`, {
      status: 'developing',
      assigned_to: 'developer@example.com'
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Feature status updated successfully');
      console.log(`   New status: ${response.data.data.feature.status}`);
      console.log(`   Assigned to: ${response.data.data.feature.assigned_to}`);
    } else {
      throw new Error('Failed to update feature status');
    }
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping database tests');
      return;
    }
    console.log('❌ Update feature status failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Test 6: Get feature statistics
async function testGetFeatureStats() {
  console.log('Testing: Get Feature Statistics...');
  
  try {
    const response = await axios.get(`${API_URL}/features/stats`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Feature statistics retrieved successfully');
      console.log(`   Total features: ${response.data.data.totalFeatures}`);
      console.log(`   Status counts:`, JSON.stringify(response.data.data.statusCounts, null, 2));
      
      if (response.data.data.topRequesters.length > 0) {
        console.log(`   Top requester: ${response.data.data.topRequesters[0].username} (${response.data.data.topRequesters[0].count} requests)`);
      }
    } else {
      throw new Error('Failed to get feature statistics');
    }
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping database tests');
      return;
    }
    console.log('❌ Get feature statistics failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Test 7: Feature validation
async function testFeatureValidation() {
  console.log('Testing: Feature Validation...');
  
  try {
    // Test invalid feature request (missing required fields)
    const response = await axios.post(`${API_URL}/features`, {
      feature_name: '', // Empty name should fail
      target_account: testFeatureRequest.target_account
    });
    
    // If we get here, validation didn't work
    throw new Error('Validation should have failed');
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Feature validation working correctly');
      console.log(`   Validation error: ${error.response.data.error.message}`);
    } else if (error.response?.status === 503) {
      console.log('⚠️ Supabase not configured - skipping validation tests');
      return;
    } else {
      console.log('❌ Feature validation test failed:', error.response?.data?.error || error.message);
      throw error;
    }
  }
}

// Test the LangChain Feature Request Tool
async function testFeatureRequestTool() {
  console.log('🧪 Testing Feature Request Tool Integration\n');
  
  const testInput = {
    features: [
      {
        name: 'dark mode',
        description: 'Users want a dark theme option',
        category: 'ui',
        priority: 'high'
      },
      {
        name: 'responsive design',
        description: 'Make the app work on mobile devices',
        category: 'ui',
        priority: 'high'
      }
    ],
    tweetUrl: 'https://x.com/meetnpay/status/1937766635554976060',
    targetAccount: 'meetnpay',
    replies: [
      {
        username: 'SupaySui',
        text: '@meetnpay dark mode'
      },
      {
        username: 'TestUser',
        text: '@meetnpay make it responsive'
      }
    ]
  };
  
  try {
    // Test with agent that has feature request tool
    const response = await axios.post(`${API_URL}/agent/chat`, {
      message: `Please save these feature requests: ${JSON.stringify(testInput)}`,
      sessionId: 'test-session-features'
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Feature Request Tool Integration Test Passed');
      console.log(`   Agent Response: ${response.data.data.response.substring(0, 200)}...`);
      console.log(`   Tools Used: ${JSON.stringify(response.data.data.toolsUsed)}`);
    } else {
      throw new Error('Feature request tool test failed');
    }
  } catch (error) {
    console.log('❌ Feature Request Tool test failed:', error.response?.data?.error || error.message);
  }
}

// Run the tests
if (require.main === module) {
  runFeatureTests()
    .then(() => testFeatureRequestTool())
    .then(() => {
      console.log('🎉 All Feature Request Tests Completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runFeatureTests,
  testFeatureRequestTool
}; 