const { ChatOpenAI } = require("@langchain/openai");
const { getOrchestrationDatabase } = require('./orchestrationDatabaseService');

class OrchestrationChatService {
  constructor() {
    this.model = null;
    this.database = null;
    this.initialized = false;
  }

  /**
   * Initialize the chat service
   */
  async initialize() {
    try {
      // Initialize GPT-4o-mini model for chat
      this.model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.3, // Slightly creative for natural conversation
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Initialize database service
      this.database = getOrchestrationDatabase();
      await this.database.initialize();

      this.initialized = true;
      console.log('🤖 Orchestration Chat Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Orchestration Chat Service:', error.message);
      throw error;
    }
  }

  /**
   * Process user chat message
   */
  async processMessage(message, sessionId, userId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Save user message to database
      await this.database.saveChatMessage({
        sessionId,
        userId,
        message,
        messageType: 'user',
        status: 'processing'
      });

      // Parse message intent and extract data
      const intent = await this.parseIntent(message);
      const extractedData = this.extractData(message, intent);

      // Process based on intent
      let response;
      switch (intent.type) {
        case 'deploy':
          response = await this.handleDeployCommand(extractedData, sessionId, userId);
          break;
        case 'status':
          response = await this.handleStatusQuery(extractedData);
          break;
        case 'feature_query':
          response = await this.handleFeatureQuery(extractedData);
          break;
        case 'config':
          response = await this.handleConfigCommand(extractedData);
          break;
        case 'help':
          response = this.getHelpResponse();
          break;
        default:
          response = await this.handleGeneralChat(message);
      }

      // Save response to database
      await this.database.saveChatMessage({
        sessionId,
        userId,
        message,
        messageType: 'orchestrator',
        response: response.text,
        intent: intent.type,
        extractedData,
        status: 'completed'
      });

      return {
        success: true,
        response: response.text,
        intent: intent.type,
        entities: extractedData,
        data: response.data || {}
      };

    } catch (error) {
      console.error('Chat processing error:', error);
      
      // Save error response
      await this.database.saveChatMessage({
        sessionId,
        userId,
        message,
        messageType: 'system',
        response: 'I encountered an error processing your request. Please try again.',
        status: 'error'
      });

      return {
        success: false,
        error: error.message,
        response: "I encountered an error processing your request. Please try again."
      };
    }
  }

  /**
   * Parse user intent using simple text analysis (fallback from GPT-4)
   */
  async parseIntent(message) {
    // For now, use fallback method to avoid LangChain API issues
    // TODO: Fix LangChain integration later
    console.log('Using fallback intent parsing for message:', message);
    return this.fallbackIntentParsing(message);
  }

  /**
   * Fallback intent parsing using simple text analysis
   */
  fallbackIntentParsing(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('deploy') || (lowerMessage.includes('github') && lowerMessage.includes('monitor'))) {
      return { type: 'deploy', confidence: 0.6 };
    } else if (lowerMessage.includes('status') || lowerMessage.includes('deployment')) {
      return { type: 'status', confidence: 0.6 };
    } else if (lowerMessage.includes('feature') || lowerMessage.includes('request')) {
      return { type: 'feature_query', confidence: 0.6 };
    } else if (lowerMessage.includes('config') || lowerMessage.includes('setting')) {
      return { type: 'config', confidence: 0.6 };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return { type: 'help', confidence: 0.6 };
    } else {
      return { type: 'general', confidence: 0.4 };
    }
  }

  /**
   * Extract structured data from user message
   */
  extractData(message, intent) {
    const data = {
      github_url: null,
      social_url: null,
      githubRepos: [],
      urls: [],
      keywords: [],
      numbers: []
    };

    // Extract GitHub repositories
    const githubRegex = /(?:@?https?:\/\/)?github\.com\/([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+)/gi;
    let match;
    while ((match = githubRegex.exec(message)) !== null) {
      const [owner, name] = match[1].split('/');
      const githubUrl = `https://github.com/${match[1]}`;
      
      data.githubRepos.push({
        fullName: match[1],
        owner,
        name,
        url: githubUrl
      });
      
      // Set the first GitHub URL as the primary one
      if (!data.github_url) {
        data.github_url = githubUrl;
      }
    }

    // Extract social media URLs
    const urlRegex = /(https?:\/\/(?:twitter\.com|x\.com|instagram\.com|linkedin\.com)\/[^\s]+)/gi;
    while ((match = urlRegex.exec(message)) !== null) {
      const socialUrl = match[1];
      data.urls.push({
        url: socialUrl,
        type: this.detectUrlType(socialUrl)
      });
      
      // Set the first social URL as the primary one
      if (!data.social_url) {
        data.social_url = socialUrl;
      }
    }

    // Extract keywords for feature queries
    if (intent.type === 'feature_query') {
      const keywords = message.toLowerCase().match(/\b(dark mode|light mode|responsive|mobile|notification|search|filter|export|import|dashboard|api|authentication|security|performance|ui|ux)\b/gi);
      data.keywords = keywords || [];
    }

    // Extract numbers (for intervals, limits, etc.)
    const numberRegex = /\b(\d+)\s*(minute|hour|day|second)s?\b/gi;
    while ((match = numberRegex.exec(message)) !== null) {
      data.numbers.push({
        value: parseInt(match[1]),
        unit: match[2]
      });
    }

    return data;
  }

  /**
   * Handle deployment commands
   */
  async handleDeployCommand(extractedData, sessionId, userId) {
    const deployments = [];
    
    try {
      // Process GitHub repos
      for (const repo of extractedData.githubRepos) {
        try {
          const savedRepo = await this.database.addGitHubRepo({
            url: repo.url,
            owner: repo.owner,
            name: repo.name,
            description: `Repository added via chat by ${userId || 'user'}`
          });
          deployments.push({ type: 'github', data: savedRepo });
        } catch (error) {
          if (error.message.includes('duplicate')) {
            deployments.push({ type: 'github', data: repo, status: 'already_exists' });
          } else {
            throw error;
          }
        }
      }

      // Process URLs
      for (const urlData of extractedData.urls) {
        try {
          const savedUrl = await this.database.addMonitoredUrl({
            url: urlData.url,
            type: urlData.type,
            title: `${urlData.type} URL added via chat`,
            description: `Added by ${userId || 'user'} in session ${sessionId}`
          });
          deployments.push({ type: 'url', data: savedUrl });
        } catch (error) {
          if (error.message.includes('duplicate')) {
            deployments.push({ type: 'url', data: urlData, status: 'already_exists' });
          } else {
            throw error;
          }
        }
      }

      // Create deployment if we have both repo and URL
      if (extractedData.githubRepos.length > 0 && extractedData.urls.length > 0) {
        const deployment = await this.database.createDeployment({
          name: `Chat Deployment ${Date.now()}`,
          githubRepoId: deployments.find(d => d.type === 'github')?.data.id,
          monitoredUrlId: deployments.find(d => d.type === 'url')?.data.id,
          configuration: { 
            interval_minutes: 60,
            created_via: 'chat',
            session_id: sessionId 
          },
          createdBy: userId || 'anonymous'
        });
        deployments.push({ type: 'deployment', data: deployment });
      }

      let responseText = "🚀 Deployment successful!\n\n";
      
      deployments.forEach(dep => {
        switch (dep.type) {
          case 'github':
            responseText += `✅ GitHub repo: ${dep.data.repo_owner}/${dep.data.repo_name}`;
            if (dep.status === 'already_exists') responseText += ' (already being monitored)';
            responseText += '\n';
            break;
          case 'url':
            responseText += `✅ URL: ${dep.data.url}`;
            if (dep.status === 'already_exists') responseText += ' (already being monitored)';
            responseText += '\n';
            break;
          case 'deployment':
            responseText += `✅ Orchestration deployment created: ${dep.data.deployment_name}\n`;
            break;
        }
      });

      responseText += '\n🎯 The orchestration agent will now monitor these resources automatically!';

      return {
        text: responseText,
        data: { deployments }
      };

    } catch (error) {
      return {
        text: `❌ Deployment failed: ${error.message}`,
        data: { error: error.message }
      };
    }
  }

  /**
   * Handle status queries
   */
  async handleStatusQuery(extractedData) {
    try {
      const deployments = await this.database.getDeploymentsToRun();
      const urlsToCheck = await this.database.getUrlsToCheck();
      
      let responseText = "📊 **Orchestration Status**\n\n";
      
      responseText += `🔄 **Active Deployments:** ${deployments.length}\n`;
      responseText += `🔗 **Monitored URLs:** ${urlsToCheck.length}\n\n`;
      
      if (deployments.length > 0) {
        responseText += "**Recent Deployments:**\n";
        deployments.slice(0, 3).forEach(dep => {
          responseText += `• ${dep.deployment_name} - ${dep.status}\n`;
          responseText += `  └─ Runs: ${dep.run_count}, Errors: ${dep.error_count}\n`;
        });
      }
      
      if (urlsToCheck.length > 0) {
        responseText += "\n**URLs Being Monitored:**\n";
        urlsToCheck.slice(0, 3).forEach(url => {
          responseText += `• ${url.url_type.toUpperCase()}: ${url.url}\n`;
          responseText += `  └─ Priority: ${url.priority}, Check every: ${url.check_frequency_minutes}min\n`;
        });
      }

      return {
        text: responseText,
        data: { deployments, urlsToCheck }
      };
    } catch (error) {
      return {
        text: `❌ Error fetching status: ${error.message}`,
        data: { error: error.message }
      };
    }
  }

  /**
   * Handle feature request queries
   */
  async handleFeatureQuery(extractedData) {
    try {
      let features = [];
      
      if (extractedData.keywords.length > 0) {
        // Search by keywords
        for (const keyword of extractedData.keywords) {
          const results = await this.database.searchFeatureRequests(keyword, 10);
          features = features.concat(results);
        }
      } else {
        // Get general stats
        const stats = await this.database.getFeatureRequestStats();
        features = stats;
      }

      let responseText = "🎯 **Feature Request Analysis**\n\n";
      
      if (extractedData.keywords.length > 0) {
        responseText += `Searched for: ${extractedData.keywords.join(', ')}\n`;
        responseText += `Found ${features.length} matching feature requests:\n\n`;
        
        features.slice(0, 5).forEach(feature => {
          responseText += `• **${feature.name}** (${feature.priority} priority)\n`;
          responseText += `  └─ Status: ${feature.status} | Category: ${feature.category}\n`;
          responseText += `  └─ ${feature.description?.substring(0, 80)}...\n\n`;
        });
      } else {
        // Show statistics
        const statusCounts = features.reduce((acc, f) => {
          acc[f.status] = (acc[f.status] || 0) + 1;
          return acc;
        }, {});
        
        const priorityCounts = features.reduce((acc, f) => {
          acc[f.priority] = (acc[f.priority] || 0) + 1;
          return acc;
        }, {});
        
        responseText += `**Total Features:** ${features.length}\n\n`;
        responseText += "**By Status:**\n";
        Object.entries(statusCounts).forEach(([status, count]) => {
          responseText += `• ${status}: ${count}\n`;
        });
        
        responseText += "\n**By Priority:**\n";
        Object.entries(priorityCounts).forEach(([priority, count]) => {
          responseText += `• ${priority}: ${count}\n`;
        });
      }

      return {
        text: responseText,
        data: { features, keywords: extractedData.keywords }
      };
    } catch (error) {
      return {
        text: `❌ Error querying features: ${error.message}`,
        data: { error: error.message }
      };
    }
  }

  /**
   * Handle configuration commands
   */
  async handleConfigCommand(extractedData) {
    // This would implement configuration changes
    // For now, return a helpful response
    return {
      text: "⚙️ Configuration commands are coming soon! Currently supported:\n• Check intervals\n• Priority settings\n• Notification preferences",
      data: { extractedData }
    };
  }

  /**
   * Get help response
   */
  getHelpResponse() {
    return {
      text: `🤖 **Orchestration Agent Help**

**Available Commands:**

🚀 **Deploy Agent:**
• "deploy agent on github.com/user/repo and twitter.com/user/status/123"
• "monitor github.com/user/repo"
• "add twitter.com/user/status/123 to monitoring"

📊 **Check Status:**
• "what's the status?"
• "show me active deployments"
• "how many URLs are being monitored?"

🎯 **Feature Queries:**
• "show me feature requests for dark mode"
• "what features are high priority?"
• "search for mobile features"

⚙️ **Configuration:**
• "change check interval to 30 minutes"
• "set priority to high"

Just type naturally - I'll understand what you want to do!`,
      data: {}
    };
  }

  /**
   * Handle general conversation
   */
  async handleGeneralChat(message) {
    // Simple fallback response for general chat
    return {
      text: "I'm here to help you with orchestration tasks! You can:\n\n• Deploy agents on GitHub repos and social media URLs\n• Check the status of your deployments\n• Query feature requests\n• Configure monitoring settings\n\nTry saying something like: 'deploy agent on github.com/user/repo and monitor twitter.com/user/status/123'",
      data: {}
    };
  }

  /**
   * Detect URL type from URL string
   */
  detectUrlType(url) {
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('linkedin.com')) return 'linkedin';
    return 'social';
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId) {
    if (!this.initialized) await this.initialize();
    return await this.database.getChatHistory(sessionId);
  }
}

// Singleton instance
let chatInstance = null;

/**
 * Get or create chat service instance
 */
function getOrchestrationChatService() {
  if (!chatInstance) {
    chatInstance = new OrchestrationChatService();
  }
  return chatInstance;
}

module.exports = {
  OrchestrationChatService,
  getOrchestrationChatService
}; 