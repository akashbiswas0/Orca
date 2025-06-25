const { Tool } = require("langchain/tools");
const { createClient } = require('@supabase/supabase-js');

/**
 * Feature Request Tool for LangChain Agent
 * This tool extracts feature requests from Twitter replies and saves them to Supabase
 */
class FeatureRequestTool extends Tool {
  constructor() {
    super();
    this.name = "feature_request_tracker";
    this.description = `Use this tool to save feature requests extracted from Twitter replies to the database.
    Input should be a JSON string with the following structure:
    - features: array of feature objects with name, description, category, priority
    - tweetUrl: URL of the original tweet
    - targetAccount: username of the account for which features are requested
    - replies: array of reply objects with username and text
    
    Example input format:
    features array contains objects with name like "dark mode" or "responsive design"
    category can be "ui", "feature", "bug", or "enhancement"
    priority can be "low", "medium", "high", or "critical"
    
    This tool automatically:
    - Saves each feature request to the database
    - Prevents duplicates
    - Tracks who requested what
    - Sets initial status as 'requested'
    
    Use this tool when you analyze Twitter replies and find feature requests mentioned by users.`;
    
    this.supabase = null;
    this.initializeSupabase();
  }

  async initializeSupabase() {
    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase credentials not found. Feature request tracking will be disabled.');
        return;
      }

      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      
      console.log('✅ Supabase client initialized for feature tracking');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error.message);
    }
  }

  async _call(input) {
    try {
      if (!this.supabase) {
        return 'Feature request tracking is disabled. Please configure Supabase credentials.';
      }

      // Parse the input JSON
      let data;
      try {
        data = JSON.parse(input);
      } catch (parseError) {
        return `Error parsing input JSON: ${parseError.message}. Expected format: features array, tweetUrl string, targetAccount string, replies array`;
      }

      const { features, tweetUrl, targetAccount, replies } = data;

      if (!features || !Array.isArray(features) || features.length === 0) {
        return 'No features found to save.';
      }

      const savedFeatures = [];
      const errors = [];

      // Process each feature request
      for (const feature of features) {
        try {
          // Find the user who requested this specific feature
          const requestingUser = this.findRequestingUser(feature, replies);
          
          const featureRequest = {
            feature_name: feature.name.toLowerCase().trim(),
            description: feature.description || `User requested ${feature.name}`,
            category: feature.category || 'feature',
            priority: feature.priority || 'medium',
            requested_by_username: requestingUser.username,
            tweet_url: tweetUrl,
            target_account: targetAccount,
            reply_text: requestingUser.text,
            status: 'requested'
          };

          // Insert into Supabase (with upsert to handle duplicates)
          const { data: insertedData, error } = await this.supabase
            .from('feature_requests')
            .upsert(featureRequest, {
              onConflict: 'feature_name,target_account',
              ignoreDuplicates: false
            })
            .select();

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              errors.push(`Feature "${feature.name}" already exists for ${targetAccount}`);
            } else {
              errors.push(`Error saving "${feature.name}": ${error.message}`);
            }
          } else {
            savedFeatures.push(feature.name);
          }

        } catch (featureError) {
          errors.push(`Error processing "${feature.name}": ${featureError.message}`);
        }
      }

      // Generate response summary
      let response = '';
      
      if (savedFeatures.length > 0) {
        response += `✅ Successfully saved ${savedFeatures.length} feature request(s): ${savedFeatures.join(', ')}\n`;
      }
      
      if (errors.length > 0) {
        response += `⚠️ Issues encountered: ${errors.join('; ')}\n`;
      }

      response += `📊 Total features tracked for ${targetAccount}: ${await this.getFeatureCount(targetAccount)}`;

      return response;

    } catch (error) {
      return `Error saving feature requests: ${error.message}`;
    }
  }

  /**
   * Find which user requested a specific feature based on reply analysis
   */
  findRequestingUser(feature, replies) {
    // Try to find the reply that mentions this feature
    const featureName = feature.name.toLowerCase();
    
    for (const reply of replies) {
      const replyText = reply.text.toLowerCase();
      
      // Check if this reply mentions the feature
      if (replyText.includes(featureName) || 
          this.isFeatureRelated(replyText, featureName)) {
        return reply;
      }
    }
    
    // If no specific match, return the first reply (fallback)
    return replies[0] || { username: 'unknown', text: 'Feature request detected' };
  }

  /**
   * Check if a reply text is related to a specific feature
   */
  isFeatureRelated(replyText, featureName) {
    const keywords = {
      'dark mode': ['dark', 'theme', 'night', 'mode'],
      'responsive': ['responsive', 'mobile', 'tablet', 'device'],
      'notification': ['notification', 'alert', 'notify'],
      'search': ['search', 'find', 'filter'],
      'authentication': ['auth', 'login', 'signup', 'account']
    };

    const relatedKeywords = keywords[featureName] || [];
    return relatedKeywords.some(keyword => replyText.includes(keyword));
  }

  /**
   * Get total count of features for a target account
   */
  async getFeatureCount(targetAccount) {
    try {
      const { count, error } = await this.supabase
        .from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_account', targetAccount);

      return error ? 'unknown' : count;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get feature requests summary for a target account
   */
  async getFeatureSummary(targetAccount) {
    try {
      const { data, error } = await this.supabase
        .from('feature_requests')
        .select('feature_name, status, priority, requested_by_username, created_at')
        .eq('target_account', targetAccount)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching feature summary:', error);
      return [];
    }
  }
}

module.exports = FeatureRequestTool; 