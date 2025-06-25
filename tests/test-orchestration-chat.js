const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

/**
 * Test orchestration chat functionality
 */
async function testOrchestrationChat() {
  console.log('🤖 Testing Orchestration Chat System...\n');
  
  const sessionId = `test-session-${Date.now()}`;
  
  try {
    // Test 1: Help command
    console.log('1. Testing help command...');
    const helpResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: "help",
      sessionId,
      userId: "test-user"
    });
    console.log('✅ Help response:', helpResponse.data.response.substring(0, 200) + '...');
    console.log('');

    // Test 2: Deploy command with GitHub repo and Twitter URL
    console.log('2. Testing deployment command...');
    const deployResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: "deploy agent on github.com/example/test-repo and https://x.com/meetnpay/status/1937766635554976060",
      sessionId,
      userId: "test-user"
    });
    console.log('✅ Deploy response:', JSON.stringify(deployResponse.data, null, 2));
    console.log('');

    // Test 3: Status query
    console.log('3. Testing status query...');
    const statusResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: "what's the status of my deployments?",
      sessionId,
      userId: "test-user"
    });
    console.log('✅ Status response:', statusResponse.data.response);
    console.log('');

    // Test 4: Feature query
    console.log('4. Testing feature query...');
    const featureResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: "show me feature requests for dark mode",
      sessionId,
      userId: "test-user"
    });
    console.log('✅ Feature response:', featureResponse.data.response);
    console.log('');

    // Test 5: Get chat history
    console.log('5. Testing chat history...');
    const historyResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/history/${sessionId}`);
    console.log('✅ Chat history:', JSON.stringify(historyResponse.data, null, 2));
    console.log('');

    console.log('🎉 All orchestration chat tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test orchestration database endpoints
 */
async function testOrchestrationDatabase() {
  console.log('\n📊 Testing Orchestration Database Endpoints...\n');
  
  try {
    // Test 1: Get repositories
    console.log('1. Getting monitored repositories...');
    const reposResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/repos`);
    console.log('✅ Repositories:', JSON.stringify(reposResponse.data, null, 2));
    console.log('');

    // Test 2: Get monitored URLs
    console.log('2. Getting monitored URLs...');
    const urlsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/urls`);
    console.log('✅ Monitored URLs:', JSON.stringify(urlsResponse.data, null, 2));
    console.log('');

    // Test 3: Get deployments
    console.log('3. Getting deployments...');
    const deploymentsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/deployments`);
    console.log('✅ Deployments:', JSON.stringify(deploymentsResponse.data, null, 2));
    console.log('');

    // Test 4: Add repository manually
    console.log('4. Adding repository manually...');
    const addRepoResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/repos`, {
      url: "https://github.com/test/manual-repo",
      owner: "test",
      name: "manual-repo",
      description: "Test repository added manually"
    });
    console.log('✅ Added repository:', JSON.stringify(addRepoResponse.data, null, 2));
    console.log('');

    // Test 5: Add URL manually
    console.log('5. Adding URL manually...');
    const addUrlResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/urls`, {
      url: "https://x.com/test/status/123456789",
      type: "twitter",
      title: "Test tweet",
      description: "Test URL added manually",
      frequency: 30,
      priority: "high"
    });
    console.log('✅ Added URL:', JSON.stringify(addUrlResponse.data, null, 2));
    console.log('');

    console.log('🎉 All database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test feature request queries
 */
async function testFeatureRequests() {
  console.log('\n🎯 Testing Feature Request Queries...\n');
  
  try {
    // Test 1: Get feature statistics
    console.log('1. Getting feature request statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/features/stats`);
    console.log('✅ Feature stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // Test 2: Search features
    console.log('2. Searching for features...');
    const searchResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/features/search?q=dark`);
    console.log('✅ Search results:', JSON.stringify(searchResponse.data, null, 2));
    console.log('');

    console.log('🎉 All feature request tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Feature test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test quick deploy functionality
 */
async function testQuickDeploy() {
  console.log('\n🚀 Testing Quick Deploy...\n');
  
  try {
    console.log('1. Testing quick deploy with GitHub and Twitter URL...');
    const quickDeployResponse = await axios.post(`${BASE_URL}/api/orchestration-chat/quick-deploy`, {
      githubUrl: "https://github.com/quick/deploy-test",
      socialUrl: "https://x.com/test/status/987654321",
      userId: "quick-deploy-user"
    });
    console.log('✅ Quick deploy result:', JSON.stringify(quickDeployResponse.data, null, 2));
    console.log('');

    console.log('🎉 Quick deploy test completed successfully!');
    
  } catch (error) {
    console.error('❌ Quick deploy test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test the specific example message format
 */
async function testSpecificExampleMessage() {
  console.log('\n🎯 Testing Specific Example Message...\n');
  
  const sessionId = `example-test-${Date.now()}`;
  const exampleMessage = "deploy agent on this github @https://github.com/priyanshur66/cat and monitor this @https://x.com/meetnpay/status/1937766635554976060";
  
  try {
    console.log('Testing specific example message:');
    console.log(`Message: "${exampleMessage}"`);
    console.log('');
    
    // Test the exact message format
    const response = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: exampleMessage,
      sessionId,
      userId: "example-user"
    });
    
    console.log('✅ Raw API Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verify the parsing results
    const { intent, entities, response: aiResponse } = response.data;
    
    console.log('🔍 Parsing Analysis:');
    console.log(`Intent: ${intent}`);
    console.log(`GitHub URL detected: ${entities.github_url || 'Not detected'}`);
    console.log(`Social URL detected: ${entities.social_url || 'Not detected'}`);
    console.log(`AI Response: ${aiResponse}`);
    console.log('');
    
    // Test if deployment was created
    if (intent === 'deploy' && entities.github_url && entities.social_url) {
      console.log('✅ Message parsed correctly as deployment command');
      
      // Check if the deployment was created in database
      const deploymentsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/deployments`);
      const deployments = deploymentsResponse.data.deployments || [];
      
      const recentDeployment = deployments.find(d => 
        d.github_url === entities.github_url && 
        d.social_url === entities.social_url
      );
      
      if (recentDeployment) {
        console.log('✅ Deployment created in database:', {
          id: recentDeployment.id,
          github_url: recentDeployment.github_url,
          social_url: recentDeployment.social_url,
          status: recentDeployment.status
        });
      } else {
        console.log('⚠️  Deployment not found in database');
      }
      
      // Check if GitHub repo was added
      const reposResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/repos`);
      const repos = reposResponse.data.repos || [];
      
      const catRepo = repos.find(r => r.url === entities.github_url);
      if (catRepo) {
        console.log('✅ GitHub repository added to database:', {
          id: catRepo.id,
          url: catRepo.url,
          owner: catRepo.owner,
          name: catRepo.name
        });
      } else {
        console.log('⚠️  GitHub repository not found in database');
      }
      
      // Check if social URL was added
      const urlsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/urls`);
      const urls = urlsResponse.data.urls || [];
      
      const twitterUrl = urls.find(u => u.url === entities.social_url);
      if (twitterUrl) {
        console.log('✅ Social media URL added to database:', {
          id: twitterUrl.id,
          url: twitterUrl.url,
          type: twitterUrl.type,
          priority: twitterUrl.priority
        });
      } else {
        console.log('⚠️  Social media URL not found in database');
      }
      
    } else {
      console.log('❌ Message not parsed correctly');
      console.log('Expected: intent=deploy, github_url and social_url should be detected');
    }
    
    console.log('');
    console.log('🎉 Specific example message test completed!');
    
  } catch (error) {
    console.error('❌ Example message test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Orchestration Chat System Tests...\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm run start');
    process.exit(1);
  }
  
  // Run all tests
  await testOrchestrationChat();
  await testOrchestrationDatabase();
  await testFeatureRequests();
  await testQuickDeploy();
  await testSpecificExampleMessage();
  await showExampleConversations();
  
  console.log('\n🎉 All tests completed!');
}

// Example conversation flows
function showExampleConversations() {
  console.log('\n💬 **Example Conversations with Orchestration Agent**\n');
  
  console.log('**Deployment Commands:**');
  console.log('• "deploy agent on github.com/mycompany/product and twitter.com/mycompany/status/123"');
  console.log('• "monitor github.com/user/repo"');
  console.log('• "add twitter.com/user/status/456 to monitoring"');
  console.log('');
  
  console.log('**Status Queries:**');
  console.log('• "what\'s the status?"');
  console.log('• "show me active deployments"');
  console.log('• "how many URLs are being monitored?"');
  console.log('');
  
  console.log('**Feature Queries:**');
  console.log('• "show me feature requests for dark mode"');
  console.log('• "what features are high priority?"');
  console.log('• "search for mobile features"');
  console.log('');
  
  console.log('**API Endpoints:**');
  console.log('• POST /api/orchestration-chat/chat - Chat with agent');
  console.log('• GET  /api/orchestration-chat/repos - Get monitored repos');
  console.log('• GET  /api/orchestration-chat/urls - Get monitored URLs');
  console.log('• GET  /api/orchestration-chat/deployments - Get deployments');
  console.log('• GET  /api/orchestration-chat/features/stats - Feature statistics');
  console.log('• POST /api/orchestration-chat/quick-deploy - Quick deployment');
  console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--examples')) {
    showExampleConversations();
  } else {
    runTests();
  }
}

module.exports = {
  testOrchestrationChat,
  testOrchestrationDatabase,
  testFeatureRequests,
  testQuickDeploy,
  testSpecificExampleMessage,
  runTests,
  showExampleConversations
}; 