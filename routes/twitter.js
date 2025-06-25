const express = require('express');
const { body, validationResult } = require('express-validator');
const { getTweetReplies } = require('../services/twitterService');

const router = express.Router();

// Validation middleware for tweet URL
const validateTweetUrl = [
  body('url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL()
    .withMessage('Must be a valid URL')
    .custom((value) => {
      // Check if it's a valid Twitter/X URL
      const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
      if (!twitterRegex.test(value)) {
        throw new Error('Must be a valid Twitter/X status URL');
      }
      return true;
    }),
  body('count')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Count must be between 1 and 100')
];

// POST /api/twitter/replies - Get replies for a tweet
router.post('/replies', validateTweetUrl, async (req, res, next) => {
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

    const { url, count = 40 } = req.body;

    // Extract tweet ID from URL
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unable to extract tweet ID from URL'
        }
      });
    }

    // Get replies from Twitter API
    const replies = await getTweetReplies(tweetId, count);

    res.status(200).json({
      success: true,
      data: {
        tweetId,
        totalReplies: replies.length,
        replies
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to extract tweet ID from URL
function extractTweetId(url) {
  const regex = /\/status\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

module.exports = router; 