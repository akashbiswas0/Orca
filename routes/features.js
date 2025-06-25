const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Middleware to check if Supabase is configured
const requireSupabase = (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Feature request tracking is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
      }
    });
  }
  next();
};

// GET /api/features - Get all feature requests
router.get('/', requireSupabase, async (req, res, next) => {
  try {
    const { target_account, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (target_account) {
      query = query.eq('target_account', target_account);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {
        features: data,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > offset + limit
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/features/summary/:account - Get feature summary for a specific account
router.get('/summary/:account', requireSupabase, async (req, res, next) => {
  try {
    const { account } = req.params;

    // Get features grouped by status
    const { data: summary, error: summaryError } = await supabase
      .from('feature_requests_summary')
      .select('*')
      .eq('target_account', account);

    if (summaryError) throw summaryError;

    // Get recent features
    const { data: recent, error: recentError } = await supabase
      .from('feature_requests')
      .select('feature_name, status, priority, requested_by_username, created_at')
      .eq('target_account', account)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    res.status(200).json({
      success: true,
      data: {
        account,
        summary: summary || [],
        recentFeatures: recent || [],
        totalFeatures: summary?.reduce((acc, item) => acc + item.count, 0) || 0
      }
    });

  } catch (error) {
    next(error);
  }
});

// PUT /api/features/:id/status - Update feature status
router.put('/:id/status', requireSupabase, [
  body('status')
    .isIn(['requested', 'developing', 'pr_raised', 'shipped'])
    .withMessage('Status must be one of: requested, developing, pr_raised, shipped'),
  body('assigned_to').optional().isString(),
  body('github_issue_url').optional().isURL()
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

    const { id } = req.params;
    const { status, assigned_to, github_issue_url } = req.body;

    const updateData = { status };
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (github_issue_url !== undefined) updateData.github_issue_url = github_issue_url;

    const { data, error } = await supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Feature request not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        feature: data[0],
        message: `Feature status updated to: ${status}`
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/features - Manually create a feature request
router.post('/', requireSupabase, [
  body('feature_name').notEmpty().withMessage('Feature name is required'),
  body('target_account').notEmpty().withMessage('Target account is required'),
  body('requested_by_username').notEmpty().withMessage('Requesting username is required'),
  body('description').optional().isString(),
  body('category').optional().isIn(['feature', 'ui', 'bug', 'enhancement']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
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

    const featureRequest = {
      feature_name: req.body.feature_name.toLowerCase().trim(),
      description: req.body.description || `Manually created feature: ${req.body.feature_name}`,
      category: req.body.category || 'feature',
      priority: req.body.priority || 'medium',
      requested_by_username: req.body.requested_by_username,
      target_account: req.body.target_account,
      tweet_url: req.body.tweet_url || '',
      reply_text: req.body.reply_text || 'Manually created',
      status: 'requested'
    };

    const { data, error } = await supabase
      .from('feature_requests')
      .insert(featureRequest)
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: {
            message: `Feature "${req.body.feature_name}" already exists for ${req.body.target_account}`
          }
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data: {
        feature: data[0],
        message: 'Feature request created successfully'
      }
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/features/:id - Delete a feature request
router.delete('/:id', requireSupabase, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('feature_requests')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Feature request not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Feature request deleted successfully',
        deletedFeature: data[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/features/stats - Get overall statistics
router.get('/stats', requireSupabase, async (req, res, next) => {
  try {
    // Get total counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('feature_requests')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = data.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });

    if (statusError) throw statusError;

    // Get top requesting users
    const { data: topUsers, error: usersError } = await supabase
      .from('feature_requests')
      .select('requested_by_username')
      .then(({ data, error }) => {
        if (error) throw error;
        const userCounts = data.reduce((acc, item) => {
          acc[item.requested_by_username] = (acc[item.requested_by_username] || 0) + 1;
          return acc;
        }, {});
        const sorted = Object.entries(userCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([username, count]) => ({ username, count }));
        return { data: sorted, error: null };
      });

    if (usersError) throw usersError;

    res.status(200).json({
      success: true,
      data: {
        statusCounts: statusCounts || {},
        topRequesters: topUsers || [],
        totalFeatures: Object.values(statusCounts || {}).reduce((a, b) => a + b, 0)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router; 