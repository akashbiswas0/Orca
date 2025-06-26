const { createClient } = require('@supabase/supabase-js');

class OrchestrationDatabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  /**
   * Initialize Supabase connection
   */
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not found in environment variables');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.initialized = true;
      console.log('✅ Orchestration Database Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Orchestration Database Service:', error.message);
      throw error;
    }
  }

  /**
   * Add a new GitHub repository to monitor
   */
  async addGitHubRepo(repoData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('github_repos')
      .insert([{
        repo_url: repoData.url,
        repo_owner: repoData.owner,
        repo_name: repoData.name,
        description: repoData.description || '',
        metadata: repoData.metadata || {}
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add a new URL to monitor
   */
  async addMonitoredUrl(urlData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('monitored_urls')
      .insert([{
        url: urlData.url,
        url_type: urlData.type || 'twitter',
        title: urlData.title || '',
        description: urlData.description || '',
        github_repo: urlData.githubRepo || null,
        check_frequency_minutes: urlData.frequency || 60,
        priority: urlData.priority || 'medium',
        metadata: urlData.metadata || {}
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new orchestration deployment
   */
  async createDeployment(deploymentData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('orchestration_deployments')
      .insert([{
        deployment_name: deploymentData.name,
        github_repo_id: deploymentData.githubRepoId,
        monitored_url_id: deploymentData.monitoredUrlId,
        configuration: deploymentData.configuration || {},
        created_by: deploymentData.createdBy || 'system',
        next_run_at: new Date(Date.now() + (deploymentData.intervalMinutes || 60) * 60 * 1000)
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all active URLs that need to be checked
   */
  async getUrlsToCheck() {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('monitored_urls')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all active deployments that need to run
   */
  async getDeploymentsToRun() {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('orchestration_deployments')
      .select(`
        *,
        github_repos (*),
        monitored_urls (*)
      `)
      .eq('status', 'active')
      .or(`next_run_at.is.null,next_run_at.lt.${new Date().toISOString()}`);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update URL check status
   */
  async updateUrlCheckStatus(urlId, status = 'checked') {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('monitored_urls')
      .update({
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', urlId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update deployment run status
   */
  async updateDeploymentRun(deploymentId, success = true, error = null) {
    if (!this.initialized) await this.initialize();
    
    const updateData = {
      last_run_at: new Date().toISOString(),
      run_count: this.supabase.raw('run_count + 1'),
      updated_at: new Date().toISOString()
    };

    if (success) {
      // Schedule next run based on configuration
      updateData.next_run_at = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes default
    } else {
      updateData.error_count = this.supabase.raw('error_count + 1');
      updateData.last_error = error;
    }

    const { data, error: dbError } = await this.supabase
      .from('orchestration_deployments')
      .update(updateData)
      .eq('id', deploymentId)
      .select()
      .single();

    if (dbError) throw dbError;
    return data;
  }

  /**
   * Save chat conversation
   */
  async saveChatMessage(chatData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('orchestration_chats')
      .insert([{
        session_id: chatData.sessionId,
        user_id: chatData.userId || null,
        message: chatData.message,
        message_type: chatData.messageType || 'user',
        response: chatData.response || null,
        intent: chatData.intent || null,
        extracted_data: chatData.extractedData || {},
        status: chatData.status || 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId, limit = 50) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('orchestration_chats')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Parse deployment command from user message
   */
  parseDeploymentCommand(message) {
    const githubRegex = /(?:github\.com\/|gh:)([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+)/i;
    const twitterRegex = /(https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)/i;
    
    const githubMatch = message.match(githubRegex);
    const twitterMatch = message.match(twitterRegex);
    
    return {
      githubRepo: githubMatch ? {
        fullName: githubMatch[1],
        owner: githubMatch[1].split('/')[0],
        name: githubMatch[1].split('/')[1]
      } : null,
      twitterUrl: twitterMatch ? twitterMatch[1] : null,
      isDeployCommand: message.toLowerCase().includes('deploy') && (githubMatch || twitterMatch)
    };
  }

  /**
   * Get feature request status and statistics
   */
  async getFeatureRequestStats(filters = {}) {
    if (!this.initialized) await this.initialize();
    
    let query = this.supabase
      .from('feature_requests')
      .select('status, priority, category, created_at');
    
    if (filters.githubRepo) {
      // Join with orchestration_contexts to filter by repo
      query = this.supabase
        .from('feature_requests')
        .select(`
          *,
          orchestration_contexts!inner (
            github_repos!inner (repo_owner, repo_name)
          )
        `)
        .eq('orchestration_contexts.github_repos.repo_owner', filters.githubRepo.split('/')[0])
        .eq('orchestration_contexts.github_repos.repo_name', filters.githubRepo.split('/')[1]);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Search feature requests by query
   */
  async searchFeatureRequests(query, limit = 20) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('feature_requests')
      .select(`
        *,
        orchestration_contexts (
          github_repos (repo_owner, repo_name),
          monitored_urls (url, url_type)
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get requested feature requests that need implementation
   */
  async getRequestedFeatureRequests() {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('feature_requests')
      .select('*')
      .eq('status', 'requested')
      .order('priority_order', { ascending: true }) // High priority first
      .order('created_at', { ascending: true }); // Older requests first

    if (error) throw error;
    return data || [];
  }

  /**
   * Update feature request status
   */
  async updateFeatureRequestStatus(featureId, status, metadata = {}) {
    if (!this.initialized) await this.initialize();
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Add metadata based on status
    if (status === 'pending') {
      updateData.implementation_started_at = new Date().toISOString();
      if (metadata.assignedTo) {
        updateData.assigned_to = metadata.assignedTo;
      }
    }

    if (status === 'shipped') {
      updateData.implementation_completed_at = new Date().toISOString();
      if (metadata.pullRequestUrl) {
        updateData.pull_request_url = metadata.pullRequestUrl;
      }
      if (metadata.pullRequestNumber) {
        updateData.pull_request_number = metadata.pullRequestNumber;
      }
    }

    if (status === 'failed') {
      updateData.implementation_failed_at = new Date().toISOString();
      if (metadata.error) {
        updateData.implementation_error = metadata.error;
      }
    }

    // Store additional metadata
    if (Object.keys(metadata).length > 0) {
      updateData.implementation_metadata = metadata;
    }

    const { data, error } = await this.supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', featureId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get pending feature requests (being implemented)
   */
  async getPendingFeatureRequests() {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('feature_requests')
      .select('*')
      .eq('status', 'pending')
      .order('implementation_started_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Log developer agent interaction
   */
  async logDeveloperAgentInteraction(interactionData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('developer_agent_logs')
      .insert([{
        feature_request_id: interactionData.featureRequestId,
        action: interactionData.action, // 'send_request', 'receive_response', 'error'
        message_sent: interactionData.messageSent || null,
        response_received: interactionData.responseReceived || null,
        status: interactionData.status, // 'success', 'error', 'timeout'
        error_message: interactionData.error || null,
        metadata: interactionData.metadata || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.warn('Failed to log developer agent interaction:', error.message);
      return null;
    }
    return data;
  }

  /**
   * Create a new feature request (for testing)
   */
  async createFeatureRequest(featureData) {
    if (!this.initialized) await this.initialize();
    
    const { data, error } = await this.supabase
      .from('feature_requests')
      .insert([{
        feature_name: featureData.feature_name,
        description: featureData.description,
        category: featureData.category || 'feature',
        priority: featureData.priority || 'medium',
        status: 'requested',
        requested_by_username: featureData.requested_by_username || 'test-user',
        target_account: featureData.target_account || 'test-account',
        tweet_url: featureData.tweet_url || 'https://x.com/test/status/123',
        reply_text: featureData.reply_text || 'Test feature request',
        github_repo: featureData.github_repo || null,
        context_id: featureData.context_id || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Singleton instance
let dbInstance = null;

/**
 * Get or create database service instance
 */
function getOrchestrationDatabase() {
  if (!dbInstance) {
    dbInstance = new OrchestrationDatabaseService();
  }
  return dbInstance;
}

module.exports = {
  OrchestrationDatabaseService,
  getOrchestrationDatabase
}; 