const http = require('http');

// Demo script showing both API approaches
async function demo() {
  console.log('🚀 Twitter Replies API + LangChain Agent Demo\n');

  // Test direct API
  console.log('📡 1. Direct Twitter API Usage:');
  console.log('   POST /api/twitter/replies');
  
  try {
    const directResult = await makeRequest('/api/twitter/replies', 'POST', {
      url: 'https://x.com/meetnpay/status/1937766635554976060',
      count: 10
    });
    console.log('   ✅ Success:', directResult.data.totalReplies, 'replies found');
    console.log('   📝 Reply:', directResult.data.replies[0].text);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Test agent conversational interface
  console.log('🤖 2. LangChain Agent Conversational Interface:');
  
  const conversations = [
    'Hello! What can you help me with?',
    'Can you analyze replies to: https://x.com/meetnpay/status/1937766635554976060',
    'What was the sentiment of that reply?'
  ];

  let sessionId = null;
  
  for (let i = 0; i < conversations.length; i++) {
    const message = conversations[i];
    console.log(`\n   👤 User: ${message}`);
    
    try {
      const data = {
        message,
        ...(sessionId && { sessionId })
      };
      
      const result = await makeRequest('/api/agent/chat', 'POST', data);
      
      if (result.success) {
        sessionId = result.data.sessionId;
        console.log(`   🤖 Agent: ${result.data.response}`);
        console.log(`   ⏱️  Processing: ${result.data.processingTime}`);
        console.log(`   🔧 Tools Used: ${result.data.toolsUsed.length || 0}`);
      } else {
        console.log(`   ❌ Error: ${result.error?.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Demo completed!');
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('   • Direct API access for structured data');
  console.log('   • Conversational agent for natural language queries');
  console.log('   • Session management for context retention');
  console.log('   • Automatic tool selection by the agent');
  console.log('   • Twitter URL parsing and analysis');
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

if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { demo }; 