const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

/**
 * Test orchestration chat functionality with specific deployment message
 */
async function testOrchestrationChat() {
  console.log('🤖 Testing Orchestration Chat System...\n');
  
  const sessionId = `test-session-${Date.now()}`;
  const specificMessage = "deploy agent on this github @https://github.com/priyanshur66/cat and monitor this @https://x.com/meetnpay/status/1937766635554976060";
  
  try {
    console.log('Testing specific deployment message:');
    console.log(`Message: "${specificMessage}"`);
    console.log('');
    
    // Test the specific deployment message
    const response = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: specificMessage,
      sessionId,
      userId: "test-user"
    });
    
    console.log('✅ Raw API Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verify the parsing results
    const { intent, entities, response: aiResponse } = response.data;
    
    console.log('🔍 Parsing Analysis:');
    console.log(`Intent: ${intent}`);
    console.log(`GitHub URL detected: ${entities?.github_url || 'Not detected'}`);
    console.log(`Social URL detected: ${entities?.social_url || 'Not detected'}`);
    console.log(`AI Response: ${aiResponse}`);
    console.log('');
    
    // Test if deployment was created
    if (intent === 'deploy' && entities?.github_url && entities?.social_url) {
      console.log('✅ Message parsed correctly as deployment command');
      
      // Check if the deployment was created in database
      try {
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
        
        // Check if social URL was added with github_repo link
        const urlsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/urls`);
        const urls = urlsResponse.data.urls || [];
        
        const twitterUrl = urls.find(u => u.url === entities.social_url);
        if (twitterUrl) {
          console.log('✅ Social media URL added to database:', {
            id: twitterUrl.id,
            url: twitterUrl.url,
            type: twitterUrl.type,
            github_repo: twitterUrl.github_repo || 'Not linked',
            priority: twitterUrl.priority
          });
          
          if (twitterUrl.github_repo === entities.github_url) {
            console.log('✅ GitHub repo correctly linked to monitored URL');
          } else {
            console.log('⚠️  GitHub repo not properly linked to monitored URL');
          }
        } else {
          console.log('⚠️  Social media URL not found in database');
        }
        
      } catch (dbError) {
        console.log('⚠️  Database verification failed:', dbError.message);
      }
      
    } else {
      console.log('❌ Message not parsed correctly');
      console.log('Expected: intent=deploy, github_url and social_url should be detected');
    }
    
    console.log('');
    console.log('🎉 Orchestration chat test completed!');
    
  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Orchestration Chat Test...\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm run start');
    process.exit(1);
  }
  
  // Run the test
  await testOrchestrationChat();
  
  console.log('\n🎉 Test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testOrchestrationChat,
  runTests
}; 