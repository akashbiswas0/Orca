const { getOrchestrationAgent } = require('./services/orchestrationService');

/**
 * Auto-start orchestration agent on server startup
 */
async function initializeOrchestration() {
  try {
    console.log('🎭 Initializing Multi-Agent Architecture...');
    
    const orchestrator = getOrchestrationAgent();
    
    // Wait a few seconds for server to fully start
    setTimeout(() => {
      console.log('🚀 Starting Orchestration Agent...');
      orchestrator.start();
      
      console.log('✅ Multi-Agent Architecture initialized successfully');
      console.log('📊 Orchestration Status:', JSON.stringify(orchestrator.getStatus(), null, 2));
    }, 5000); // 5 second delay
    
  } catch (error) {
    console.error('❌ Failed to initialize orchestration agent:', error.message);
  }
}

// Auto-start if this script is run directly
if (require.main === module) {
  initializeOrchestration();
}

module.exports = {
  initializeOrchestration
}; 