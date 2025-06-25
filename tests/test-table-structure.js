const { getOrchestrationDatabase } = require('../services/orchestrationDatabaseService');

/**
 * Diagnostic script to check table structure
 */
async function checkTableStructure() {
  console.log('🔍 Checking Database Table Structure...\n');
  
  try {
    // Get database service
    const db = getOrchestrationDatabase();
    
    // Initialize connection
    console.log('1. Initializing database connection...');
    await db.initialize();
    console.log('✅ Database connection initialized\n');
    
    // Check if orchestration_chats table exists
    console.log('2. Checking orchestration_chats table structure...');
    
    try {
      // Try to get table structure using information_schema
      const { data: columns, error } = await db.supabase
        .rpc('get_table_columns', { table_name: 'orchestration_chats' });
        
      if (error) {
        console.log('⚠️  Could not get table structure via RPC, trying direct query...');
        
        // Try direct query to see what happens
        const { data: testData, error: testError } = await db.supabase
          .from('orchestration_chats')
          .select('*')
          .limit(1);
          
        if (testError) {
          console.log('❌ Table query failed:', testError.message);
          
          if (testError.message.includes('does not exist')) {
            console.log('\n📋 DIAGNOSIS: orchestration_chats table does not exist');
            console.log('SOLUTION: Run the full schema setup or table recreation script');
          } else if (testError.message.includes('column')) {
            console.log('\n📋 DIAGNOSIS: Table exists but has wrong column structure');
            console.log('SOLUTION: Run the table recreation script');
          }
        } else {
          console.log('✅ Table exists and is queryable');
          console.log('Sample data structure:', testData);
        }
      } else {
        console.log('✅ Table structure retrieved:', columns);
      }
      
    } catch (structureError) {
      console.log('❌ Structure check failed:', structureError.message);
    }
    
    // Try to check what tables actually exist
    console.log('\n3. Checking what tables exist in the database...');
    
    const tablesToCheck = [
      'orchestration_chats',
      'monitored_urls', 
      'github_repos',
      'orchestration_deployments'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await db.supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation')) {
            console.log(`❌ Table ${tableName}: Does not exist`);
          } else {
            console.log(`⚠️  Table ${tableName}: Exists but has issues - ${error.message}`);
          }
        } else {
          console.log(`✅ Table ${tableName}: Exists and accessible`);
        }
      } catch (tableError) {
        console.log(`❌ Table ${tableName}: Error - ${tableError.message}`);
      }
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('1. If orchestration_chats does not exist: Run database/orchestration-schema.sql');
    console.log('2. If orchestration_chats exists but has wrong columns: Run database/recreate-orchestration-chats.sql');
    console.log('3. If other tables are missing: Run the full schema setup');
    
  } catch (error) {
    console.error('❌ Table structure check failed:', error.message);
    
    if (error.message.includes('Supabase credentials')) {
      console.log('\n🔧 SOLUTION:');
      console.log('Please ensure your .env file contains:');
      console.log('SUPABASE_URL=your_supabase_url');
      console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
    }
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  checkTableStructure().catch(console.error);
}

module.exports = { checkTableStructure }; 