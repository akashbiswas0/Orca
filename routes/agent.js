const express = require('express');
const { body, validationResult } = require('express-validator');
const { getAgent } = require('../services/agentService');

const router = express.Router();

// In-memory session storage (in production, use Redis or database)
const userSessions = new Map();

// Validation middleware for chat messages
const validateChatMessage = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
];

// POST /api/agent/chat - Main chat endpoint
router.post('/chat', validateChatMessage, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { message, sessionId } = req.body;
    const agent = getAgent();

    // Get or create session
    const currentSessionId = sessionId || generateSessionId();
    let session = userSessions.get(currentSessionId);
    
    if (!session) {
      session = {
        id: currentSessionId,
        history: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      userSessions.set(currentSessionId, session);
    }

    // Update last activity
    session.lastActivity = new Date();

    // Process message with agent
    const startTime = Date.now();
    const agentResponse = await agent.processMessage(message, session.history);
    const processingTime = Date.now() - startTime;

    // Update session history
    session.history.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: agentResponse.response, timestamp: new Date() }
    );

    // Keep only last 20 messages to prevent memory bloat
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: currentSessionId,
        response: agentResponse.response,
        processingTime: `${processingTime}ms`,
        toolsUsed: agentResponse.toolsUsed || [],
        messageCount: session.history.length / 2
      }
    });

  } catch (error) {
    console.error('Agent chat error:', error);
    next(error);
  }
});

// GET /api/agent/status - Get agent status and capabilities
router.get('/status', async (req, res, next) => {
  try {
    const agent = getAgent();
    const status = agent.getStatus();
    
    res.status(200).json({
      success: true,
      data: {
        agent: status,
        sessions: {
          active: userSessions.size,
          cleanup: 'Sessions older than 1 hour are automatically cleaned'
        },
        uptime: process.uptime()
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/agent/reset - Reset conversation context
router.post('/reset', [
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { sessionId } = req.body;
    
    // Clear session history
    if (userSessions.has(sessionId)) {
      const session = userSessions.get(sessionId);
      session.history = [];
      session.lastActivity = new Date();
      
      res.status(200).json({
        success: true,
        message: 'Conversation context reset successfully',
        data: {
          sessionId,
          historyCleared: true
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: 'Session not found'
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/agent/history/:sessionId - Get conversation history
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = userSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Session not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        history: session.history,
        messageCount: session.history.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/agent/quick-analyze - Quick Twitter URL analysis
router.post('/quick-analyze', [
  body('url')
    .notEmpty()
    .withMessage('Twitter URL is required')
    .matches(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/)
    .withMessage('Must be a valid Twitter/X status URL')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { url } = req.body;
    const agent = getAgent();
    
    const message = `Please analyze the replies to this Twitter post: ${url}`;
    const agentResponse = await agent.processMessage(message, []);

    res.status(200).json({
      success: true,
      data: {
        url,
        analysis: agentResponse.response,
        toolsUsed: agentResponse.toolsUsed || []
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to generate session ID
function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Cleanup old sessions (run every hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [sessionId, session] of userSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      userSessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old sessions`);
  }
}, 60 * 60 * 1000); // Every hour

module.exports = router; 