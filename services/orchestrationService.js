const io = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getOrchestrationDatabase } = require('./orchestrationDatabaseService');

/**
 * Developer Agent Client for Socket.IO communication
 */
class DeveloperAgentClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl || process.env.DEVELOPER_AGENT_URL || 'http://localhost:3000';
    this.socket = null;
    this.channelId = uuidv4();
    this.entityId = uuidv4();
    this.messageCallbacks = new Map();
    this.connected = false;
    this.connecting = false;
  }

  /**
   * Create a channel via HTTP API
   */
  async createChannel() {
    try {
      console.log(`📝 Creating channel...`);
      const response = await axios.post(`${this.serverUrl}/api/messaging/channels`, {
        name: `Developer Agent Channel`,
        serverId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        description: "Channel for feature implementation communication",
        type: "text"
      });

      console.log('✅ Channel created successfully:', response.data);
      
      // Update the channel ID from the response
      if (response.data && response.data.id) {
        this.channelId = response.data.id;
        console.log(`📝 Using channel ID: ${this.channelId}`);
      }
      
      return true;
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Channel already exists');
        return true; // Channel already exists, that's fine
      }
      console.error('❌ Failed to create channel:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Add Eliza agent to the channel so it can respond to messages
   */
  async addAgentToChannel() {
    try {
      // First, get the Eliza agent ID
      console.log('🔍 Getting agents list...');
      const agentsResponse = await axios.get(`${this.serverUrl}/api/agents`);
      console.log('📋 Agents response:', JSON.stringify(agentsResponse.data, null, 2));
      
      // Handle the actual API response format: { success: true, data: { agents: [...] } }
      let agents = agentsResponse.data;
      
      // Extract agents from nested structure
      if (agents.data && agents.data.agents) {
        agents = agents.data.agents; // Handle { success: true, data: { agents: [...] } }
      } else if (agents.agents) {
        agents = agents.agents; // Handle { agents: [...] }
      } else if (Array.isArray(agents)) {
        // Already an array, keep as is
      } else if (agents.name === 'Eliza') {
        agents = [agents]; // Single agent object
      } else {
        throw new Error(`Unexpected agents response format. Got: ${JSON.stringify(agents, null, 2)}`);
      }
      
      if (!Array.isArray(agents)) {
        throw new Error(`Agents is not an array after processing. Got: ${typeof agents}`);
      }
      
      const elizaAgent = agents.find(agent => agent.name === 'Eliza');
      
      if (!elizaAgent) {
        console.log('❌ Available agents:', agents.map(a => a.name || a.id));
        throw new Error('Eliza agent not found in agents list');
      }

      console.log('✅ Found Eliza agent:', elizaAgent.id);

      // Create the channel first
      const channelCreated = await this.createChannel();
      if (!channelCreated) {
        throw new Error('Failed to create channel');
      }

      // Add the agent to the channel
      console.log(`🔗 Adding agent ${elizaAgent.id} to channel ${this.channelId}...`);
      const response = await axios.post(
        `${this.serverUrl}/api/messaging/channels/${this.channelId}/agents`,
        {
          agentId: elizaAgent.id
        }
      );

      console.log('✅ Eliza agent added to channel successfully:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Failed to add agent to channel:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Connect to the developer agent
   */
  async connect() {
    if (this.connected || this.connecting) return;
    
    this.connecting = true;
    
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 10000
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', async () => {
          console.log('🔌 Connected to developer agent');
          this.connected = true;
          
          // Join the channel
          await this.joinChannel();
          
          // Add Eliza agent to channel so it can respond
          const agentAdded = await this.addAgentToChannel();
          
          if (agentAdded) {
            // Give the agent a moment to register in the channel
            console.log('⏳ Waiting for agent registration...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from developer agent');
          this.connected = false;
        });

        this.socket.on('message', (data) => {
          this.handleAgentResponse(data);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error.message);
          reject(error);
        });

        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      this.connecting = false;
      throw error;
    }
  }

  /**
   * Join communication channel with the agent
   */
  async joinChannel() {
    if (!this.socket || !this.connected) return;

    this.socket.emit('message', {
      type: 1, // ROOM_JOINING
      payload: {
        channelId: this.channelId,
        roomId: this.channelId,
        entityId: this.entityId
      }
    });
  }

  /**
   * Handle responses from the developer agent
   */
  handleAgentResponse(response) {
    console.log('🤖 Developer Agent Response:', response.payload?.content?.substring(0, 200) + '...');
    
    const messageId = response.payload?.metadata?.inReplyTo;
    if (messageId && this.messageCallbacks.has(messageId)) {
      const callback = this.messageCallbacks.get(messageId);
      callback(response);
      this.messageCallbacks.delete(messageId);
    }
  }

  /**
   * Send feature implementation request to developer agent
   */
  async implementFeature(featureRequest, timeout = 120000) {
    if (!this.connected) {
      await this.connect();
    }

    const messageId = uuidv4();
    const repository = featureRequest.github_repo;
    
    if (!repository) {
      throw new Error(`No GitHub repository URL found for feature request: ${featureRequest.feature_name}`);
    }

    const message = `implement ${featureRequest.feature_name} in this web app @${repository}`;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.messageCallbacks.delete(messageId);
        reject(new Error('Developer agent request timeout'));
      }, timeout);

      this.messageCallbacks.set(messageId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this.socket.emit('message', {
        type: 2, // SEND_MESSAGE
        payload: {
          senderId: this.entityId,
          senderName: "OrchestrationAgent",
          message: message,
          channelId: this.channelId,
          roomId: this.channelId,
          serverId: "00000000-0000-0000-0000-000000000000",
          messageId: messageId,
          source: "external_agent",
          metadata: {
            channelType: "DM",
            isDm: true,
            targetUserId: "eliza-agent",
            priority: featureRequest.priority || "normal",
            timeout: timeout,
            featureRequestId: featureRequest.id,
            inReplyTo: messageId
          }
        }
      });
    });
  }

  /**
   * Parse developer agent response for PR information
   */
  parseImplementationResponse(response) {
    const content = response.payload?.content || '';
    const metadata = response.payload?.metadata || {};

    // Check for success indicators
    const isSuccess = content.includes('✅') && content.includes('Implementation Complete');
    const isError = content.includes('❌') && content.includes('Implementation Failed');

    // Extract PR URL
    const prUrlMatch = content.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/);
    const pullRequestUrl = prUrlMatch ? prUrlMatch[0] : null;
    const pullRequestNumber = prUrlMatch ? parseInt(prUrlMatch[1]) : null;

    // Extract files modified
    const filesModified = metadata.filesModified || [];

    return {
      success: isSuccess,
      error: isError,
      pullRequestUrl,
      pullRequestNumber,
      filesModified,
      content,
      metadata
    };
  }

  /**
   * Disconnect from developer agent
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}

class OrchestrationAgent {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.sessionId = `orchestrator-${Date.now()}`;
    this.apiUrl = process.env.AGENT_API_URL || 'http://localhost:3001';
    this.intervalMinutes = 2;
    this.taskQueue = [];
    this.currentTaskIndex = 0;
    this.initialized = false;
    this.database = null;
    this.developerAgent = null;
  }

  /**
   * Initialize the orchestration agent with database connection
   */
  async initialize() {
    try {
      // Initialize database connection
      this.database = getOrchestrationDatabase();
      await this.database.initialize();

      // Initialize developer agent client
      this.developerAgent = new DeveloperAgentClient();
      
      // Load tasks from database
      await this.loadTasksFromDatabase();
      
      this.initialized = true;
      console.log('🎯 Orchestration Agent initialized successfully with database');
    } catch (error) {
      console.error('❌ Failed to initialize Orchestration Agent:', error.message);
      // Fallback to default tasks if database fails
      this.setupDefaultTasks();
      this.initialized = true;
    }
  }

  /**
   * Load tasks from database
   */
  async loadTasksFromDatabase() {
    try {
      const urlsToCheck = await this.database.getUrlsToCheck();
      const deployments = await this.database.getDeploymentsToRun();
      
      this.taskQueue = [];
      
      // Create tasks from monitored URLs
      urlsToCheck.forEach(url => {
        this.taskQueue.push({
          id: `url-${url.id}`,
          message: `Analyze this ${url.url_type} post for feature requests: ${url.url}`,
          type: 'url_analysis',
          urlId: url.id,
          url: url.url,
          urlType: url.url_type,
          priority: url.priority
        });
      });
      
      // Create tasks from deployments
      deployments.forEach(deployment => {
        if (deployment.monitored_urls?.url) {
          this.taskQueue.push({
            id: `deployment-${deployment.id}`,
            message: `Monitor deployment: ${deployment.deployment_name} - Check ${deployment.monitored_urls.url}`,
            type: 'deployment_monitoring',
            deploymentId: deployment.id,
            url: deployment.monitored_urls.url,
            githubRepo: deployment.github_repos?.repo_owner + '/' + deployment.github_repos?.repo_name
          });
        }
      });
      
      // No fallback to default tasks - only use database tasks
      
      console.log(`📝 Loaded ${this.taskQueue.length} tasks from database`);
    } catch (error) {
      console.error('❌ Failed to load tasks from database:', error.message);
      console.log('📝 No fallback tasks - orchestration will wait for database tasks');
    }
  }

  /**
   * Setup default monitoring tasks (fallback)
   */
  setupDefaultTasks() {
    this.taskQueue = [
      {
        id: 'monitor-1',
        message: "Monitor recent trending tweets for feature requests",
        type: 'monitoring'
      },
      {
        id: 'analyze-1', 
        message: "What are people saying about this tweet: https://x.com/meetnpay/status/1937766635554976060",
        type: 'analysis'
      },
      {
        id: 'search-1',
        message: "Find tweets about mobile app feature requests in the last hour",
        type: 'search'
      },
      {
        id: 'report-1',
        message: "Generate a summary of all feature requests found today",
        type: 'reporting'
      }
    ];
    console.log('📝 Using default task queue');
  }

  /**
   * Add a new task to the queue
   */
  addTask(task) {
    this.taskQueue.push({
      id: `task-${Date.now()}`,
      message: task.message,
      type: task.type || 'custom',
      priority: task.priority || 'normal',
      addedAt: new Date().toISOString()
    });
    console.log(`📝 Task added to queue: ${task.message.substring(0, 50)}...`);
  }

  /**
   * Get next task from queue (round-robin)
   */
  getNextTask() {
    if (this.taskQueue.length === 0) {
      console.log('⚠️  No tasks in queue - waiting for database tasks to be loaded');
      return null;
    }
    
    const task = this.taskQueue[this.currentTaskIndex];
    this.currentTaskIndex = (this.currentTaskIndex + 1) % this.taskQueue.length;
    return task;
  }

  /**
   * Send message to social media agent
   */
  async sendToAgent(message, taskId = null) {
    try {
      const payload = {
        message: message,
        sessionId: this.sessionId,
        orchestratorTask: taskId,
        timestamp: new Date().toISOString()
      };

      console.log(`🚀 Orchestrator sending to agent: ${message.substring(0, 100)}...`);
      
      const response = await axios.post(`${this.apiUrl}/api/agent/chat`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OrchestrationAgent/1.0'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log(`✅ Agent response received for task ${taskId}`);
      const responseText = response.data.response || response.data.message || 'No response text';
      console.log(`📊 Response: ${responseText.substring(0, 200)}...`);
      
      return {
        success: true,
        taskId: taskId,
        request: message,
        response: response.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to send message to agent:`, error.message);
      return {
        success: false,
        taskId: taskId,
        request: message,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute orchestration cycle
   */
  async executeOrchestrationCycle() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Step 1: Handle approved feature requests first
      await this.processRequestedFeatureRequests();

      // Step 2: Check pending feature requests for completion
      await this.checkPendingFeatureRequests();

      // Step 3: Always refresh tasks from database on every cycle
      await this.loadTasksFromDatabase();
      
      const task = this.getNextTask();
      
      if (!task) {
        console.log('\n⏳ Orchestration Cycle - No tasks available, trying to reload from database...');
        await this.loadTasksFromDatabase();
        return;
      }
      
      console.log(`\n🎭 Orchestration Cycle - Executing: ${task.type} task`);
      console.log(`📋 Task ID: ${task.id}`);
      
      const result = await this.sendToAgent(task.message, task.id);
      
      // Update database with execution results
      await this.updateDatabaseAfterExecution(task, result);
      
      // Log the interaction
      this.logInteraction(result);
      
      // Process the response if needed
      await this.processAgentResponse(result);
      
    } catch (error) {
      console.error('❌ Orchestration cycle failed:', error.message);
    }
  }

  /**
   * Process requested feature requests and send them to developer agent
   */
  async processRequestedFeatureRequests() {
    try {
      const requestedFeatures = await this.database.getRequestedFeatureRequests();
      
      if (requestedFeatures.length === 0) {
        console.log('📝 No requested feature requests found');
        return;
      }

      console.log(`\n🎯 Processing ${requestedFeatures.length} requested feature requests`);

      let implementedCount = 0;

      for (const feature of requestedFeatures) {
        try {
          console.log(`\n🔨 Implementing feature: "${feature.feature_name}" (ID: ${feature.id})`);
          
          // Update status to pending
          await this.database.updateFeatureRequestStatus(feature.id, 'pending', {
            assignedTo: 'developer-agent'
          });

          // Log the request
          await this.database.logDeveloperAgentInteraction({
            featureRequestId: feature.id,
            action: 'send_request',
            messageSent: `implement ${feature.feature_name}`,
            status: 'pending'
          });

          // Send to developer agent
          const result = await this.developerAgent.implementFeature(feature);
          
          // Process the response
          const parsedResult = this.developerAgent.parseImplementationResponse(result);
          
          if (parsedResult.success) {
            // Update to shipped status
            await this.database.updateFeatureRequestStatus(feature.id, 'shipped', {
              pullRequestUrl: parsedResult.pullRequestUrl,
              pullRequestNumber: parsedResult.pullRequestNumber
            });

            // Log success
            await this.database.logDeveloperAgentInteraction({
              featureRequestId: feature.id,
              action: 'receive_response',
              responseReceived: parsedResult.content,
              status: 'success',
              metadata: { 
                pullRequestUrl: parsedResult.pullRequestUrl,
                filesModified: parsedResult.filesModified 
              }
            });

            console.log(`✅ Feature "${feature.feature_name}" implemented successfully - PR: ${result.pullRequestUrl}`);
            implementedCount++;

          } else if (parsedResult.error) {
            // Update to failed status
            await this.database.updateFeatureRequestStatus(feature.id, 'failed', {
              error: parsedResult.content
            });
            console.log(`❌ Feature "${feature.feature_name}" implementation failed: ${result.content}`);
          } else {
            console.log(`⏳ Feature "${feature.feature_name}" is still being processed by developer agent`);
          }

        } catch (error) {
          console.error(`❌ Error implementing feature "${feature.feature_name}":`, error.message);
          
          // Update to failed status
          await this.database.updateFeatureRequestStatus(feature.id, 'failed', {
            error: error.message
          });

          // Log error
          await this.database.logDeveloperAgentInteraction({
            featureRequestId: feature.id,
            action: 'error',
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`🚀 ${implementedCount} features implemented successfully`);
    } catch (error) {
      console.error('❌ Error processing requested feature requests:', error.message);
    }
  }

  /**
   * Check pending feature requests for completion updates
   */
  async checkPendingFeatureRequests() {
    try {
      const pendingFeatures = await this.database.getPendingFeatureRequests();
      
      if (pendingFeatures.length === 0) {
        return;
      }

      console.log(`\n🔍 Checking ${pendingFeatures.length} pending feature requests for updates`);

      for (const feature of pendingFeatures) {
        try {
          // Check if it's been pending too long (more than 10 minutes)
          const startedAt = new Date(feature.implementation_started_at);
          const now = new Date();
          const minutesPending = (now - startedAt) / (1000 * 60);

          if (minutesPending > 10) {
            console.log(`⚠️ Feature "${feature.feature_name}" has been pending for ${Math.round(minutesPending)} minutes`);
            
            // Could implement timeout logic here
            // For now, we'll keep it pending
          }

          // Additional logic for checking GitHub PR status could be added here
          // if we want to verify completion independently

        } catch (error) {
          console.error(`❌ Error checking pending feature ${feature.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error checking pending feature requests:', error.message);
    }
  }

  /**
   * Update database after task execution
   */
  async updateDatabaseAfterExecution(task, result) {
    if (!this.database) return;
    
    try {
      // Update URL check status
      if (task.type === 'url_analysis' && task.urlId) {
        await this.database.updateUrlCheckStatus(task.urlId);
      }
      
      // Update deployment run status
      if (task.type === 'deployment_monitoring' && task.deploymentId) {
        await this.database.updateDeploymentRun(
          task.deploymentId, 
          result.success, 
          result.error || null
        );
      }
    } catch (error) {
      console.error('❌ Failed to update database:', error.message);
    }
  }

  /**
   * Process agent response and take follow-up actions
   */
  async processAgentResponse(result) {
    if (!result.success) {
      console.log('⚠️  Agent request failed, will retry in next cycle');
      return;
    }

    // Extract insights from response
    const response = result.response.response || result.response.message || '';
    
    // Check if feature requests were found
    if (response.toLowerCase().includes('feature request') || 
        response.toLowerCase().includes('saved to database')) {
      console.log('🎯 Feature requests detected in response');
      // Could add more sophisticated processing here
    }

    // Check if error handling is needed
    if (response.toLowerCase().includes('error') || 
        response.toLowerCase().includes('failed')) {
      console.log('⚠️  Error detected in agent response');
      // Could add error handling logic here
    }
  }

  /**
   * Log orchestration interactions
   */
  logInteraction(result) {
    const logEntry = {
      timestamp: result.timestamp,
      taskId: result.taskId,
      success: result.success,
      requestLength: result.request.length,
      responseLength: result.success ? (result.response.response || '').length : 0,
      error: result.error || null
    };
    
    console.log('📝 Interaction logged:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Start orchestration with periodic execution
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Orchestration Agent is already running');
      return;
    }

    console.log(`🚀 Starting Orchestration Agent - will execute every ${this.intervalMinutes} minutes`);
    
    // Execute immediately on start
    this.executeOrchestrationCycle();
    
    // Set up periodic execution
    this.intervalId = setInterval(() => {
      this.executeOrchestrationCycle();
    }, this.intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
    console.log('✅ Orchestration Agent started successfully');
  }

  /**
   * Stop orchestration
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Orchestration Agent is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Orchestration Agent stopped');
  }

  /**
   * Get orchestration status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      initialized: this.initialized,
      sessionId: this.sessionId,
      intervalMinutes: this.intervalMinutes,
      tasksInQueue: this.taskQueue.length,
      currentTaskIndex: this.currentTaskIndex,
      apiUrl: this.apiUrl,
      nextTask: this.taskQueue[this.currentTaskIndex] || null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.intervalMinutes && config.intervalMinutes > 0) {
      this.intervalMinutes = config.intervalMinutes;
      
      // Restart if running to apply new interval
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }
    
    if (config.apiUrl) {
      this.apiUrl = config.apiUrl;
    }
    
    console.log('⚙️  Orchestration config updated:', config);
  }
}

// Singleton instance
let orchestrationInstance = null;

/**
 * Get or create orchestration agent instance
 */
function getOrchestrationAgent() {
  if (!orchestrationInstance) {
    orchestrationInstance = new OrchestrationAgent();
  }
  return orchestrationInstance;
}

module.exports = {
  OrchestrationAgent,
  getOrchestrationAgent
}; 