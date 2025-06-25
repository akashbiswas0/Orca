const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

/**
 * Test orchestration agent functionality
 */
async function testOrchestrationAgent() {
  console.log('🧪 Testing Orchestration Agent...\n');
  
  try {
    // Test 1: Get orchestration status
    console.log('1. Getting orchestration status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/orchestration/status`);
    console.log('✅ Status:', JSON.stringify(statusResponse.data, null, 2));
    console.log('');
    
    // Test 2: Add a custom task
    console.log('2. Adding custom task...');
    const taskResponse = await axios.post(`${BASE_URL}/api/orchestration/task`, {
      message: "Analyze this tweet for feature requests: https://x.com/example/status/123456789",
      type: "analysis",
      priority: "high"
    });
    console.log('✅ Task added:', JSON.stringify(taskResponse.data, null, 2));
    console.log('');
    
    // Test 3: Start orchestration
    console.log('3. Starting orchestration agent...');
    const startResponse = await axios.post(`${BASE_URL}/api/orchestration/start`);
    console.log('✅ Orchestration started:', JSON.stringify(startResponse.data, null, 2));
    console.log('');
    
    // Test 4: Manually trigger a cycle
    console.log('4. Manually triggering orchestration cycle...');
    const triggerResponse = await axios.post(`${BASE_URL}/api/orchestration/trigger`);
    console.log('✅ Cycle triggered:', JSON.stringify(triggerResponse.data, null, 2));
    console.log('');
    
    // Test 5: Update configuration
    console.log('5. Updating orchestration configuration...');
    const configResponse = await axios.post(`${BASE_URL}/api/orchestration/config`, {
      intervalMinutes: 1, // Change to 1 minute for testing
      apiUrl: BASE_URL
    });
    console.log('✅ Config updated:', JSON.stringify(configResponse.data, null, 2));
    console.log('');
    
    // Test 6: Wait and check status again
    console.log('6. Waiting 10 seconds and checking status...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/orchestration/status`);
    console.log('✅ Final status:', JSON.stringify(finalStatusResponse.data, null, 2));
    console.log('');
    
    // Test 7: Stop orchestration
    console.log('7. Stopping orchestration agent...');
    const stopResponse = await axios.post(`${BASE_URL}/api/orchestration/stop`);
    console.log('✅ Orchestration stopped:', JSON.stringify(stopResponse.data, null, 2));
    
    console.log('\n🎉 All orchestration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test multi-agent interaction
 */
async function testMultiAgentInteraction() {
  console.log('\n🤖 Testing Multi-Agent Interaction...\n');
  
  try {
    // Start orchestration
    console.log('1. Starting orchestration for multi-agent test...');
    await axios.post(`${BASE_URL}/api/orchestration/start`);
    
    // Wait for a few cycles
    console.log('2. Waiting for orchestration cycles (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check what happened
    console.log('3. Checking orchestration activity...');
    const statusResponse = await axios.get(`${BASE_URL}/api/orchestration/status`);
    console.log('✅ Multi-agent status:', JSON.stringify(statusResponse.data, null, 2));
    
    // Stop orchestration
    console.log('4. Stopping orchestration...');
    await axios.post(`${BASE_URL}/api/orchestration/stop`);
    
    console.log('\n🎉 Multi-agent interaction test completed!');
    
  } catch (error) {
    console.error('❌ Multi-agent test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Orchestration Agent Tests...\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm run start');
    process.exit(1);
  }
  
  // Run tests
  await testOrchestrationAgent();
  await testMultiAgentInteraction();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testOrchestrationAgent,
  testMultiAgentInteraction,
  runTests
};