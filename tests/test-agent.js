const http = require('http');

// Test the Twitter Agent API
async function testAgentAPI() {
  const testCases = [
    {
      name: 'Agent Status Check',
      endpoint: '/api/agent/status',
      method: 'GET'
    },
    {
      name: 'Chat - General Greeting',
      endpoint: '/api/agent/chat',
      method: 'POST',
      data: {
        message: 'Hello! What can you help me with?'
      }
    },
    {
      name: 'Chat - Twitter Analysis Request',
      endpoint: '/api/agent/chat',
      method: 'POST',
      data: {
        message: 'Can you analyze the replies to this tweet: https://x.com/meetnpay/status/1937766635554976060'
      }
    },
    {
      name: 'Quick Analysis',
      endpoint: '/api/agent/quick-analyze',
      method: 'POST',
      data: {
        url: 'https://x.com/meetnpay/status/1937766635554976060'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    try {
      const result = await makeRequest(testCase.endpoint, testCase.method, testCase.data);
      console.log('✅ Response:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('-'.repeat(50));
  }
}

function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.error?.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Health check
async function healthCheck() {
  console.log('🔍 Health Check...');
  try {
    const result = await makeRequest('/health');
    console.log('✅ Server is healthy:', result);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

// Conversational test
async function conversationalTest() {
  console.log('\n🗣️  Starting Conversational Test...\n');
  
  let sessionId = null;
  const conversation = [
    'Hello! I need help analyzing Twitter replies.',
    'Can you tell me what people are saying about this tweet: https://x.com/meetnpay/status/1937766635554976060',
    'What was the most popular reply?',
    'Thank you for your help!'
  ];

  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`👤 User: ${message}`);
    
    try {
      const data = {
        message,
        ...(sessionId && { sessionId })
      };
      
      const result = await makeRequest('/api/agent/chat', 'POST', data);
      
      if (result.success) {
        sessionId = result.data.sessionId;
        console.log(`🤖 Agent: ${result.data.response}`);
        console.log(`📊 Processing Time: ${result.data.processingTime}`);
        console.log(`🔧 Tools Used: ${JSON.stringify(result.data.toolsUsed)}`);
      } else {
        console.log(`❌ Error: ${result.error?.message}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('-'.repeat(50));
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run tests
async function main() {
  console.log('🚀 Starting Agent API Tests...\n');
  
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.log('❌ Server is not running. Please start the server first with: npm start');
    console.log('💡 Make sure to set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  await testAgentAPI();
  
  console.log('\n' + '='.repeat(60));
  await conversationalTest();
  
  console.log('\n✨ Agent tests completed!');
  console.log('\n📝 Note: If you see OpenAI API key errors, make sure to:');
  console.log('   1. Get an API key from https://platform.openai.com/');
  console.log('   2. Add OPENAI_API_KEY=your_key_here to your .env file');
  console.log('   3. Restart the server');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAgentAPI, healthCheck, conversationalTest }; 