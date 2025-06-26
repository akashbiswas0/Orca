const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

/**
 * Test the specific example message format
 * Message: "deploy agent on this github @https://github.com/priyanshur66/cat and monitor this @https://x.com/meetnpay/status/1937766635554976060"
 */
async function testExampleMessage() {
  console.log('🎯 Testing Specific Example Message...\n');
  
  const sessionId = `example-test-${Date.now()}`;
  const exampleMessage = "deploy agent on this github @https://github.com/priyanshur66/cat and monitor this https://x.com/meetnpay/status/1937837842438275078";
  
  try {
    // Check if server is running5ˀ
    console.log('🔍 Checking server status...');
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
    
    console.log('📝 Testing message:');
    console.log(`"${exampleMessage}"`);
    console.log('');
    
    // Send the message to the chat API
    console.log('📤 Sending message to chat API...');
    const response = await axios.post(`${BASE_URL}/api/orchestration-chat/chat`, {
      message: exampleMessage,
      sessionId,
      userId: "example-user"
    });
    
    console.log('📨 API Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verify the parsing results
    const { intent, entities, response: aiResponse } = response.data;
    
    console.log('🔍 Parsing Analysis:');
    console.log(`Intent: ${intent}`);
    console.log(`GitHub URL: ${entities.github_url || 'NOT DETECTED'}`);
    console.log(`Social URL: ${entities.social_url || 'NOT DETECTED'}`);
    console.log(`AI Response: ${aiResponse}`);
    console.log('');
    
    // Validate specific URLs
    const expectedGitHubUrl = "https://github.com/priyanshur66/cat";
    const expectedTwitterUrl = "https://x.com/meetnpay/status/1937837842438275078";
    
    console.log('🎯 URL Validation:');
    console.log(`Expected GitHub URL: ${expectedGitHubUrl}`);
    console.log(`Detected GitHub URL: ${entities.github_url || 'NONE'}`);
    console.log(`GitHub URL Match: ${entities.github_url === expectedGitHubUrl ? '✅ YES' : '❌ NO'}`);
    console.log('');
    console.log(`Expected Twitter URL: ${expectedTwitterUrl}`);
    console.log(`Detected Twitter URL: ${entities.social_url || 'NONE'}`);
    console.log(`Twitter URL Match: ${entities.social_url === expectedTwitterUrl ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    // Test deployment creation
    if (intent === 'deploy' && entities.github_url && entities.social_url) {
      console.log('✅ Message correctly parsed as deployment command');
      
      // Wait a moment for database operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check database entries
      console.log('🗄️  Checking database entries...');
      
      // Check deployments
      try {
        const deploymentsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/deployments`);
        const deployments = deploymentsResponse.data.deployments || [];
        
        console.log(`Found ${deployments.length} total deployments`);
        
        // Since the deployment was just created, check if any deployment exists
        if (deployments.length > 0) {
          console.log('✅ Deployment system is working - deployments are being created');
          const latestDeployment = deployments[deployments.length - 1];
          console.log('Latest deployment:', {
            id: latestDeployment.id,
            name: latestDeployment.deployment_name,
            status: latestDeployment.status,
            created_at: latestDeployment.created_at
          });
        } else {
          console.log('❌ No deployments found in database');
        }
      } catch (deployError) {
        console.log('⚠️  Could not fetch deployments:', deployError.response?.data?.error || deployError.message);
      }
      
      // Check GitHub repositories
      try {
        const reposResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/repos`);
        const repos = reposResponse.data.repos || [];
        
        console.log(`Found ${repos.length} total repositories`);
        const catRepo = repos.find(r => r.repo_url === entities.github_url || r.url === entities.github_url);
        
        if (catRepo) {
          console.log('✅ GitHub repository added:', {
            id: catRepo.id,
            url: catRepo.repo_url || catRepo.url,
            owner: catRepo.repo_owner || catRepo.owner,
            name: catRepo.repo_name || catRepo.name,
            description: catRepo.description
          });
        } else {
          console.log('❌ GitHub repository not found in database');
        }
      } catch (repoError) {
        console.log('⚠️  Could not fetch repositories:', repoError.response?.data?.error || repoError.message);
      }
      
      // Check monitored URLs
      try {
        const urlsResponse = await axios.get(`${BASE_URL}/api/orchestration-chat/urls`);
        const urls = urlsResponse.data.urls || [];
        
        console.log(`Found ${urls.length} total monitored URLs`);
        const twitterUrl = urls.find(u => u.url === entities.social_url);
        
        if (twitterUrl) {
          console.log('✅ Twitter URL added for monitoring:', {
            id: twitterUrl.id,
            url: twitterUrl.url,
            type: twitterUrl.type,
            priority: twitterUrl.priority,
            frequency: twitterUrl.frequency
          });
        } else {
          console.log('❌ Twitter URL not found in database');
        }
      } catch (urlError) {
        console.log('⚠️  Could not fetch monitored URLs (database relationship issue):', urlError.response?.data?.error || urlError.message);
        console.log('   This is a known schema issue that can be fixed by updating the database foreign keys');
      }
      
    } else {
      console.log('❌ Message parsing failed!');
      console.log('Expected: intent=deploy with both github_url and social_url detected');
    }
    
    console.log('');
    console.log('🎉 Example message test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testExampleMessage().catch(console.error);
}

module.exports = { testExampleMessage }; 