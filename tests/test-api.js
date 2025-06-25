const http = require('http');

// Test the Twitter replies API
async function testAPI() {
  const testCases = [
    {
      name: 'Valid Twitter URL',
      data: {
        url: 'https://x.com/meetnpay/status/1937766635554976060',
        count: 10
      }
    },
    {
      name: 'Invalid URL',
      data: {
        url: 'https://invalid-url.com',
        count: 10
      }
    },
    {
      name: 'Missing URL',
      data: {
        count: 10
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('Request:', JSON.stringify(testCase.data, null, 2));
    
    try {
      const result = await makeRequest(testCase.data);
      console.log('✅ Response:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('-'.repeat(50));
  }
}

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/twitter/replies',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

    req.write(postData);
    req.end();
  });
}

// Health check
async function healthCheck() {
  console.log('🔍 Health Check...');
  try {
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('✅ Server is healthy:', result);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

// Run tests
async function main() {
  console.log('🚀 Starting API Tests...\n');
  
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.log('❌ Server is not running. Please start the server first with: npm start');
    process.exit(1);
  }

  await testAPI();
  console.log('\n✨ Tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAPI, healthCheck }; 