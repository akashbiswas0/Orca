const axios = require('axios');
const { getOrchestrationDatabase } = require('./orchestrationDatabaseService');

class OrchestrationAgent {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.sessionId = `orchestrator-${Date.now()}`;
    this.apiUrl = process.env.AGENT_API_URL || 'http://localhost:3000';
    this.intervalMinutes = 2;
    this.taskQueue = [];
    this.currentTaskIndex = 0;
    this.initialized = false;
    this.database = null;
  }

  /**
   * Initialize the orchestration agent with database connection
   */
  async initialize() {
    try {
      // Initialize database connection
      this.database = getOrchestrationDatabase();
      await this.database.initialize();
      
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
      // Always refresh tasks from database on every cycle
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