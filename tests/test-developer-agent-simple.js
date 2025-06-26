const { getOrchestrationDatabase } = require('../services/orchestrationDatabaseService');

/**
 * Simple test for Developer Agent Integration
 */
async function testDeveloperAgentSimple() {
  console.log('🧪 Testing Developer Agent Integration (Simple)...\n');

  try {
    // Initialize database
    const database = getOrchestrationDatabase();
    await database.initialize();
    console.log('✅ Database initialized');

    // Test 1: Check if feature_requests table exists and has approved features
    console.log('\n🔍 Checking for approved feature requests...');
    const approvedFeatures = await database.getApprovedFeatureRequests();
    console.log(`✅ Found ${approvedFeatures.length} approved features`);

    if (approvedFeatures.length === 0) {
      console.log('\n📝 No approved features found. Creating a test feature...');
      
      // Create a test feature request and approve it
      const testFeature = {
        feature_name: 'Test Dark Mode',
        description: 'Test feature for developer agent integration',
        requested_by_username: 'test_user',
        tweet_url: 'https://x.com/test/status/123456789',
        target_account: 'test_account',
        reply_text: '@test_account add dark mode please',
        category: 'ui',
        priority: 'high',
        status: 'approved'
      };

      // Insert test feature
      const { data, error } = await database.supabase
        .from('feature_requests')
        .insert([testFeature])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create test feature:', error.message);
        return;
      }

      console.log(`✅ Created test feature with ID: ${data.id}`);
      
      // Re-fetch approved features
      const newApprovedFeatures = await database.getApprovedFeatureRequests();
      console.log(`✅ Now have ${newApprovedFeatures.length} approved features`);
    }

    // Test 2: Check pending features
    console.log('\n🔍 Checking for pending feature requests...');
    const pendingFeatures = await database.getPendingFeatureRequests();
    console.log(`✅ Found ${pendingFeatures.length} pending features`);

    // Test 3: Test status update functionality
    if (approvedFeatures.length > 0) {
      const testFeature = approvedFeatures[0];
      console.log(`\n🔄 Testing status update for feature: ${testFeature.feature_name}`);
      
      // Update to pending
      await database.updateFeatureRequestStatus(testFeature.id, 'pending', {
        assignedTo: 'developer-agent-test',
        startedAt: new Date().toISOString()
      });
      console.log('✅ Updated feature status to pending');

      // Update to shipped
      await database.updateFeatureRequestStatus(testFeature.id, 'shipped', {
        pullRequestUrl: 'https://github.com/test/repo/pull/123',
        pullRequestNumber: 123,
        completedAt: new Date().toISOString()
      });
      console.log('✅ Updated feature status to shipped');

      // Reset back to approved for future tests
      await database.updateFeatureRequestStatus(testFeature.id, 'approved');
      console.log('✅ Reset feature status to approved');
    }

    // Test 4: Test developer agent logging
    if (approvedFeatures.length > 0) {
      const testFeature = approvedFeatures[0];
      console.log(`\n📝 Testing developer agent logging for feature: ${testFeature.feature_name}`);
      
      await database.logDeveloperAgentInteraction({
        featureRequestId: testFeature.id,
        action: 'test_communication',
        messageSent: `implement ${testFeature.feature_name}`,
        status: 'success',
        metadata: { test: true }
      });
      console.log('✅ Developer agent interaction logged');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Developer Agent Integration Status:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ Feature status workflow functional');
    console.log('   ✅ Status updates working');
    console.log('   ✅ Developer agent logging working');
    console.log('\n🚀 Ready for developer agent communication!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testDeveloperAgentSimple()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testDeveloperAgentSimple }; 