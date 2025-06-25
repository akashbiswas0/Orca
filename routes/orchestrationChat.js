const express = require('express');
const { getOrchestrationChatService } = require('../services/orchestrationChatService');
const { getOrchestrationDatabase } = require('../services/orchestrationDatabaseService');
const router = express.Router();

/**
 * Chat with the orchestration agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    const chatService = getOrchestrationChatService();
    const result = await chatService.processMessage(message, sessionId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * Get chat history for a session
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    
    const chatService = getOrchestrationChatService();
    const history = await chatService.getChatHistory(sessionId, parseInt(limit));
    
    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
      details: error.message
    });
  }
});

/**
 * Get all monitored GitHub repositories
 */
router.get('/repos', async (req, res) => {
  try {
    const database = getOrchestrationDatabase();
    await database.initialize();
    
    const { data, error } = await database.supabase
      .from('github_repos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      repos: data || [],
      count: data ? data.length : 0
    });
  } catch (error) {
    console.error('Repos endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repositories',
      details: error.message
    });
  }
});

/**
 * Get all monitored URLs
 */
router.get('/urls', async (req, res) => {
  try {
    const database = getOrchestrationDatabase();
    await database.initialize();
    
    // First try with the join, fallback to simple query if relationship doesn't exist
    let { data, error } = await database.supabase
      .from('monitored_urls')
      .select(`
        *,
        github_repos (
          repo_owner,
          repo_name,
          repo_url
        )
      `)
      .order('created_at', { ascending: false });
    
    // If join fails due to relationship issues, try simple query
    if (error && error.message.includes('relationship')) {
      console.log('⚠️  Foreign key relationship not found, using simple query for URLs');
      const simpleQuery = await database.supabase
        .from('monitored_urls')
        .select('*')
        .order('created_at', { ascending: false });
      
      data = simpleQuery.data;
      error = simpleQuery.error;
    }
    
    if (error) throw error;
    
    res.json({
      success: true,
      urls: data || [],
      count: data ? data.length : 0
    });
  } catch (error) {
    console.error('URLs endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitored URLs',
      details: error.message
    });
  }
});

/**
 * Get all deployments
 */
router.get('/deployments', async (req, res) => {
  try {
    const database = getOrchestrationDatabase();
    await database.initialize();
    
    const { data, error } = await database.supabase
      .from('orchestration_deployments')
      .select(`
        *,
        github_repos (repo_owner, repo_name, repo_url),
        monitored_urls (url, url_type, title)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      deployments: data || [],
      count: data ? data.length : 0
    });
  } catch (error) {
    console.error('Deployments endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployments',
      details: error.message
    });
  }
});

/**
 * Add a GitHub repository manually
 */
router.post('/repos', async (req, res) => {
  try {
    const { url, owner, name, description } = req.body;
    
    if (!url || !owner || !name) {
      return res.status(400).json({
        success: false,
        error: 'URL, owner, and name are required'
      });
    }
    
    const database = getOrchestrationDatabase();
    const repo = await database.addGitHubRepo({
      url,
      owner,
      name,
      description: description || `Repository added manually`
    });
    
    res.json({
      success: true,
      message: 'GitHub repository added successfully',
      repo
    });
  } catch (error) {
    console.error('Add repo error:', error);
    
    if (error.message.includes('duplicate')) {
      return res.status(409).json({
        success: false,
        error: 'Repository already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add repository',
      details: error.message
    });
  }
});

/**
 * Add a monitored URL manually
 */
router.post('/urls', async (req, res) => {
  try {
    const { url, type, title, description, githubRepoId, frequency, priority } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const database = getOrchestrationDatabase();
    const monitoredUrl = await database.addMonitoredUrl({
      url,
      type: type || 'twitter',
      title: title || 'Manually added URL',
      description: description || 'Added via API',
      githubRepoId,
      frequency: frequency || 60,
      priority: priority || 'medium'
    });
    
    res.json({
      success: true,
      message: 'URL added to monitoring successfully',
      url: monitoredUrl
    });
  } catch (error) {
    console.error('Add URL error:', error);
    
    if (error.message.includes('duplicate')) {
      return res.status(409).json({
        success: false,
        error: 'URL already being monitored'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add URL',
      details: error.message
    });
  }
});

/**
 * Search feature requests
 */
router.get('/features/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }
    
    const database = getOrchestrationDatabase();
    const features = await database.searchFeatureRequests(query, parseInt(limit));
    
    res.json({
      success: true,
      features,
      count: features.length,
      query
    });
  } catch (error) {
    console.error('Feature search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search features',
      details: error.message
    });
  }
});

/**
 * Get feature request statistics
 */
router.get('/features/stats', async (req, res) => {
  try {
    const { repo } = req.query;
    
    const database = getOrchestrationDatabase();
    const features = await database.getFeatureRequestStats({ 
      githubRepo: repo 
    });
    
    // Calculate statistics
    const stats = {
      total: features.length,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      recent: features.filter(f => {
        const createdAt = new Date(f.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > weekAgo;
      }).length
    };
    
    features.forEach(feature => {
      stats.byStatus[feature.status] = (stats.byStatus[feature.status] || 0) + 1;
      stats.byPriority[feature.priority] = (stats.byPriority[feature.priority] || 0) + 1;
      stats.byCategory[feature.category] = (stats.byCategory[feature.category] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats,
      features: features.slice(0, 10) // Return top 10 for display
    });
  } catch (error) {
    console.error('Feature stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature statistics',
      details: error.message
    });
  }
});

/**
 * Quick deploy endpoint for simple deployments
 */
router.post('/quick-deploy', async (req, res) => {
  try {
    const { githubUrl, socialUrl, userId } = req.body;
    
    if (!githubUrl && !socialUrl) {
      return res.status(400).json({
        success: false,
        error: 'At least one of githubUrl or socialUrl is required'
      });
    }
    
    const sessionId = `quick-deploy-${Date.now()}`;
    let message = 'deploy agent on ';
    
    if (githubUrl) {
      message += githubUrl;
    }
    
    if (socialUrl) {
      if (githubUrl) message += ' and ';
      message += socialUrl;
    }
    
    const chatService = getOrchestrationChatService();
    const result = await chatService.processMessage(message, sessionId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Quick deploy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process quick deploy',
      details: error.message
    });
  }
});

module.exports = router; 