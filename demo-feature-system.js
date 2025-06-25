#!/usr/bin/env node

/**
 * Feature Request Tracking System Demo
 * 
 * This demo shows how the AI agent automatically detects and saves feature requests
 * from Twitter replies to a Supabase database.
 */

const axios = require('axios');

// Demo configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

console.log('🚀 Feature Request Tracking System Demo');
console.log('======================================\n');

async function runDemo() {
  try {
    // Step 1: Show the system architecture
    console.log('📋 System Architecture:');
    console.log('┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐');
    console.log('│   Twitter API   │────│   Express.js     │────│   Supabase DB   │');
    console.log('│   (RapidAPI)    │    │   Application    │    │  (PostgreSQL)   │');
    console.log('└─────────────────┘    └──────────────────┘    └─────────────────┘');
    console.log('                              │');
    console.log('                       ┌──────────────────┐');
    console.log('                       │  LangChain Agent │');
    console.log('                       │   (OpenAI GPT)   │');
    console.log('                       └──────────────────┘\n');

    // Step 2: Test Twitter analysis (this will work with actual Twitter URL)
    console.log('🐦 Step 1: Analyzing Twitter Replies');
    console.log('=====================================');
    
    try {
      const twitterResponse = await axios.post(`${API_URL}/agent/chat`, {
        message: "What are people saying about this tweet: https://x.com/meetnpay/status/1937766635554976060",
        sessionId: "demo-session"
      });
      
      if (twitterResponse.data.success) {
        console.log('✅ Twitter Analysis Successful!');
        console.log(`🤖 Agent Response: ${twitterResponse.data.data.response}`);
        console.log(`⏱️ Processing Time: ${twitterResponse.data.data.processingTime}`);
        console.log(`🔧 Tools Used: ${JSON.stringify(twitterResponse.data.data.toolsUsed)}\n`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('⚠️ OpenAI API key needed for agent functionality');
        console.log('   Set OPENAI_API_KEY in your .env file\n');
      } else {
        console.log('❌ Twitter analysis failed:', error.message);
      }
    }

    // Step 3: Show feature request API endpoints
    console.log('📊 Step 2: Feature Request Management');
    console.log('====================================');
    
    // Test feature endpoints (will show Supabase not configured message)
    try {
      const featuresResponse = await axios.get(`${API_URL}/features`);
      console.log('✅ Feature requests retrieved successfully');
      console.log(`📈 Total features: ${featuresResponse.data.data.features.length}`);
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('⚠️ Supabase not configured - showing demo data structure instead\n');
        showDemoDataStructure();
      }
    }

    // Step 4: Show the complete workflow
    console.log('🔄 Step 3: Complete Workflow Example');
    console.log('===================================');
    showWorkflowExample();

    // Step 5: Show configuration requirements
    console.log('⚙️ Step 4: Configuration Requirements');
    console.log('====================================');
    showConfigurationGuide();

    console.log('🎉 Demo Complete!');
    console.log('\nTo use this system:');
    console.log('1. Set up your environment variables (see .env.example)');
    console.log('2. Create a Supabase project and run the SQL schema');
    console.log('3. Configure your OpenAI API key');
    console.log('4. Start analyzing Twitter replies and tracking feature requests!\n');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

function showDemoDataStructure() {
  console.log('📋 Demo: Feature Request Data Structure');
  console.log('--------------------------------------');
  
  const sampleFeatureRequest = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    feature_name: "dark mode",
    description: "Users want a dark theme option for better user experience",
    category: "ui",
    priority: "high",
    requested_by_username: "SupaySui",
    tweet_url: "https://x.com/meetnpay/status/1937766635554976060",
    target_account: "meetnpay",
    reply_text: "@meetnpay dark mode",
    status: "requested",
    created_at: "2025-01-15T10:30:00.000Z",
    updated_at: "2025-01-15T10:30:00.000Z"
  };
  
  console.log(JSON.stringify(sampleFeatureRequest, null, 2));
  console.log('');
}

function showWorkflowExample() {
  console.log('User Query: "What are people saying about this tweet: https://x.com/meetnpay/status/1937766635554976060"\n');
  
  console.log('🔄 Agent Workflow:');
  console.log('  1. 🐦 Fetch Twitter replies using twitter_replies_fetcher tool');
  console.log('  2. 🧠 AI analyzes replies for feature requests');
  console.log('  3. 🎯 Detects features: "dark mode", "responsive design"');
  console.log('  4. 💾 Automatically saves to database using feature_request_tracker tool');
  console.log('  5. 📊 Returns summary to user with saved features\n');
  
  console.log('🤖 Agent Response:');
  console.log('  "I analyzed the replies to that tweet and found users requesting:');
  console.log('   • Dark mode (UI feature, high priority)');
  console.log('   • Responsive design (UI feature, high priority)');
  console.log('   ✅ Saved 2 feature requests to the database."');
  console.log('   📊 Total features tracked for meetnpay: 5"\n');
}

function showConfigurationGuide() {
  console.log('🔑 Required Environment Variables:');
  console.log('----------------------------------');
  console.log('✅ RAPIDAPI_KEY         - Twitter API access (configured)');
  console.log('⚠️ OPENAI_API_KEY       - For AI agent functionality');  
  console.log('⚠️ SUPABASE_URL         - For feature request database');
  console.log('⚠️ SUPABASE_ANON_KEY    - For database access\n');
  
  console.log('📊 Database Schema:');
  console.log('------------------');
  console.log('Run the SQL in database/schema.sql to create:');
  console.log('• feature_requests table with all required fields');
  console.log('• Indexes for performance');
  console.log('• Triggers for auto-updating timestamps');
  console.log('• Row Level Security policies\n');
  
  console.log('🧪 API Endpoints Available:');
  console.log('---------------------------');
  console.log('GET  /api/features                    - List all features');
  console.log('GET  /api/features/summary/:account   - Account summary');
  console.log('PUT  /api/features/:id/status         - Update status');
  console.log('POST /api/features                    - Create feature');
  console.log('GET  /api/features/stats              - Statistics');
  console.log('POST /api/agent/chat                  - Chat with AI');
  console.log('POST /api/twitter/replies             - Direct Twitter API\n');
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo }; 