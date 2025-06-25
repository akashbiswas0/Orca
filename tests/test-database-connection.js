const { getOrchestrationDatabase } = require('../services/orchestrationDatabaseService');

/**
 * Test database connection and table structure
 */
async function testDatabaseConnection() {
  console.log('🗄️  Testing Database Connection...\n');
  
  try {
    // Get database service
    const db = getOrchestrationDatabase();
    
    // Initialize connection
    console.log('1. Initializing database connection...');
    await db.initialize();
    console.log('✅ Database connection initialized\n');
    
    // Test orchestration_chats table specifically
    console.log('2. Testing orchestration_chats table...');
    
    const testData = {
      sessionId: 'test-connection',
      userId: 'test-user',
      message: 'Test database connection',
      response: 'Connection test successful',
      intent: 'test',
      extractedData: { test: true, timestamp: new Date().toISOString() },
      status: 'processed'
    };
    
    try {
      // Try to save a test message
      const savedMessage = await db.saveChatMessage(testData);
      console.log('✅ Successfully saved test message:', {
        id: savedMessage.id,
        session_id: savedMessage.session_id,
        extracted_data: savedMessage.extracted_data
      });
      
      // Try to retrieve chat history
      const history = await db.getChatHistory('test-connection');
      console.log('✅ Successfully retrieved chat history:', history.length, 'messages');
      
      // Clean up test data
      if (savedMessage.id) {
        await db.supabase
          .from('orchestration_chats')
          .delete()
          .eq('id', savedMessage.id);
        console.log('✅ Test data cleaned up');
      }
      
    } catch (chatError) {
      console.error('❌ orchestration_chats table test failed:', chatError.message);
      
      if (chatError.message.includes('extracted_data')) {
        console.log('\n🔧 SOLUTION:');
        console.log('The orchestration_chats table is missing the extracted_data column.');
        console.log('Please run this SQL in your Supabase dashboard:');
        console.log('');
        console.log('ALTER TABLE orchestration_chats ADD COLUMN extracted_data JSONB;');
        console.log('');
        console.log('Or run the complete fix script:');
        console.log('database/fix-orchestration-chats.sql');
      }
      
      throw chatError;
    }
    
    // Test other tables
    console.log('\n3. Testing other tables...');
    
    const tables = ['monitored_urls', 'github_repos', 'orchestration_deployments'];
    
    for (const tableName of tables) {
      try {
        const { data, error } = await db.supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ Table ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ Table ${tableName}: accessible`);
        }
      } catch (tableError) {
        console.log(`❌ Table ${tableName}: ${tableError.message}`);
      }
    }
    
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    
    if (error.message.includes('Supabase credentials')) {
      console.log('\n🔧 SOLUTION:');
      console.log('Please ensure your .env file contains:');
      console.log('SUPABASE_URL=your_supabase_url');
      console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
    }
    
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  testDatabaseConnection().catch(console.error);
}

module.exports = { testDatabaseConnection }; 