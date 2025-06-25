const express = require('express');
const { getOrchestrationAgent } = require('../services/orchestrationService');
const router = express.Router();

/**
 * Start the orchestration agent
 */
router.post('/start', async (req, res) => {
  try {
    const orchestrator = getOrchestrationAgent();
    orchestrator.start();
    
    res.json({
      success: true,
      message: 'Orchestration agent started successfully',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to start orchestration agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start orchestration agent',
      details: error.message
    });
  }
});

/**
 * Stop the orchestration agent
 */
router.post('/stop', async (req, res) => {
  try {
    const orchestrator = getOrchestrationAgent();
    orchestrator.stop();
    
    res.json({
      success: true,
      message: 'Orchestration agent stopped successfully',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to stop orchestration agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop orchestration agent',
      details: error.message
    });
  }
});

/**
 * Get orchestration agent status
 */
router.get('/status', async (req, res) => {
  try {
    const orchestrator = getOrchestrationAgent();
    const status = orchestrator.getStatus();
    
    res.json({
      success: true,
      status: status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get orchestration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orchestration status',
      details: error.message
    });
  }
});

/**
 * Add a task to the orchestration queue
 */
router.post('/task', async (req, res) => {
  try {
    const { message, type, priority } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const orchestrator = getOrchestrationAgent();
    orchestrator.addTask({
      message,
      type: type || 'custom',
      priority: priority || 'normal'
    });
    
    res.json({
      success: true,
      message: 'Task added to orchestration queue',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to add orchestration task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add orchestration task',
      details: error.message
    });
  }
});

/**
 * Update orchestration configuration
 */
router.post('/config', async (req, res) => {
  try {
    const { intervalMinutes, apiUrl } = req.body;
    
    const orchestrator = getOrchestrationAgent();
    orchestrator.updateConfig({
      intervalMinutes,
      apiUrl
    });
    
    res.json({
      success: true,
      message: 'Orchestration configuration updated',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to update orchestration config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update orchestration config',
      details: error.message
    });
  }
});

/**
 * Manually trigger an orchestration cycle
 */
router.post('/trigger', async (req, res) => {
  try {
    const orchestrator = getOrchestrationAgent();
    
    // Execute cycle in background
    orchestrator.executeOrchestrationCycle()
      .catch(error => console.error('Manual orchestration cycle failed:', error));
    
    res.json({
      success: true,
      message: 'Orchestration cycle triggered manually',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to trigger orchestration cycle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger orchestration cycle',
      details: error.message
    });
  }
});

/**
 * Manually refresh task queue from database
 */
router.post('/refresh', async (req, res) => {
  try {
    const orchestrator = getOrchestrationAgent();
    await orchestrator.loadTasksFromDatabase();
    
    res.json({
      success: true,
      message: 'Task queue refreshed from database',
      status: orchestrator.getStatus()
    });
  } catch (error) {
    console.error('Failed to refresh task queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh task queue',
      details: error.message
    });
  }
});

module.exports = router; 