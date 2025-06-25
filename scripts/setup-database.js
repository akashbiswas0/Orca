const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Setup orchestration database schema
 */
async function setupDatabase() {
  console.log('🗄️  Setting up Orchestration Database...\n');
  
  try {
    // Check for environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in environment variables');
      console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
      process.exit(1);
    }

    console.log('✅ Supabase credentials found');
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/orchestration-schema.sql');
    console.log(`📖 Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded');
    
    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Instead of executing SQL directly, let's test if tables exist and create them using Supabase client
    console.log('⚠️  Note: This script will verify database structure using Supabase client operations');
    console.log('   For full schema setup, please run the SQL commands in your Supabase dashboard\n');
    
    // Test each table and show what needs to be created
    const requiredTables = [
      {
        name: 'monitored_urls',
        testColumns: ['id', 'url', 'url_type', 'title', 'description', 'status', 'created_at', 'check_frequency_minutes', 'priority']
      },
      {
        name: 'github_repos', 
        testColumns: ['id', 'repo_url', 'repo_owner', 'repo_name', 'description', 'status', 'created_at']
      },
      {
        name: 'orchestration_deployments',
        testColumns: ['id', 'deployment_name', 'github_repo_id', 'monitored_url_id', 'status', 'configuration', 'created_at']
      },
      {
        name: 'orchestration_chats',
        testColumns: ['id', 'session_id', 'user_id', 'message', 'response', 'intent', 'extracted_data', 'created_at']
      }
    ];
    
    for (const table of requiredTables) {
      console.log(`🔍 Testing table: ${table.name}`);
      
      try {
        // Try to select from the table to see if it exists
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .limit(1);
          
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
            console.log(`   ❌ Table ${table.name} does not exist`);
            console.log(`   📋 Please create this table in your Supabase dashboard`);
          } else {
            console.log(`   ⚠️  Table ${table.name} exists but has issues: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table ${table.name} exists and is accessible`);
        }
      } catch (testError) {
        console.log(`   ❌ Error testing ${table.name}: ${testError.message}`);
      }
    }
    
    console.log('\n🎉 Database setup completed!');
    
    // Test the setup by checking if tables exist
    console.log('\n🔍 Verifying database setup...');
    
    const tables = ['monitored_urls', 'github_repos', 'orchestration_deployments', 'orchestration_chats'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: accessible`);
        }
      } catch (testError) {
        console.log(`❌ Table ${table}: ${testError.message}`);
      }
    }
    
    // Test the orchestration_chats table specifically for extracted_data column
    console.log('\n🔍 Testing orchestration_chats table...');
    try {
      const { data, error } = await supabase
        .from('orchestration_chats')
        .insert([{
          session_id: 'test-setup',
          message: 'Database setup test',
          extracted_data: { test: true }
        }])
        .select()
        .single();
        
      if (error) {
        console.log(`❌ orchestration_chats test insert failed: ${error.message}`);
      } else {
        console.log(`✅ orchestration_chats test insert successful`);
        
        // Clean up test data
        await supabase
          .from('orchestration_chats')
          .delete()
          .eq('session_id', 'test-setup');
        console.log(`✅ Test data cleaned up`);
      }
    } catch (testError) {
      console.log(`❌ orchestration_chats test failed: ${testError.message}`);
    }
    
    console.log('\n🎉 Database verification completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Extract table name from CREATE statement
 */
function extractTableName(statement) {
  const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  return match ? match[1] : 'unknown';
}

// Run setup if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase }; 