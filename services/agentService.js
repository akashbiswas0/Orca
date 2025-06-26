const { ChatOpenAI } = require("@langchain/openai");
const { initializeAgentExecutorWithOptions } = require("langchain/agents");
const TwitterRepliesTool = require('../tools/twitterTool');
const FeatureRequestTool = require('../tools/featureRequestTool');

class TwitterAgent {
  constructor() {
    this.model = null;
    this.tools = [];
    this.agent = null;
    this.agentExecutor = null;
    this.initialized = false;
  }

  /**
   * Initialize the agent with OpenAI model and tools
   */
  async initialize() {
    try {
      // Initialize OpenAI model
      this.model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Initialize tools
      this.tools = [
        new TwitterRepliesTool(),
        new FeatureRequestTool()
      ];

      // Create agent executor with tools
      this.agentExecutor = await initializeAgentExecutorWithOptions(
        this.tools,
        this.model,
        {
          agentType: "zero-shot-react-description",
          verbose: true,
          maxIterations: 3,
          handleParsingErrors: true,
        }
      );

      this.initialized = true;
      console.log('🤖 Twitter Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twitter Agent:', error.message);
      throw error;
    }
  }

  /**
   * Get system prompt for the agent
   */
  getSystemPrompt() {
    return `You are a helpful Twitter analysis assistant with feature request tracking capabilities.

**Your main capabilities:**
- Fetch replies/comments for any Twitter or X post URL
- Analyze sentiment and engagement of replies
- Provide insights about the conversation
- **AUTOMATICALLY TRACK FEATURE REQUESTS** mentioned in replies
- Identify trending topics in replies
- Summarize key points from the discussion

**CRITICAL: Feature Request Detection & Tracking:**
When you analyze Twitter replies and find feature requests (like "dark mode", "responsive design", "notifications", etc.), you MUST:

1. First use twitter_replies_fetcher to get the replies
2. Analyze the replies for feature requests
3. **IMMEDIATELY use feature_request_tracker tool** to save any feature requests found
4. Then provide your response to the user

**How to use your tools:**
1. **twitter_replies_fetcher**: Get replies from Twitter URLs
2. **feature_request_tracker**: Save feature requests to database with this JSON format:
   - features: array of feature objects with name, description, category, priority
   - tweetUrl: original tweet URL
   - targetAccount: account username  
   - replies: array of reply objects with username and text

**Feature Detection Examples:**
- "dark mode" → UI feature, high priority
- "responsive design" → UI feature, high priority  
- "notifications" → Feature, medium priority
- "search functionality" → Feature, medium priority
- "mobile app" → Feature, high priority

**Workflow for Twitter Analysis:**
1. Get replies using twitter_replies_fetcher
2. Analyze replies for feature requests
3. If feature requests found → use feature_request_tracker to save them
4. Provide user-friendly summary including saved features

**Guidelines:**
- Be conversational and helpful
- Always track feature requests automatically
- Provide context and insights, not just raw data
- Mention when features have been saved to the database
- Keep responses engaging and informative

Remember: ALWAYS track feature requests when you find them in Twitter replies!`;
  }

  /**
   * Process user message and generate response
   */
  async processMessage(message, chatHistory = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create system message with capabilities
      const systemMessage = this.getSystemPrompt();
      const fullMessage = `${systemMessage}\n\nHuman: ${message}`;

      const result = await this.agentExecutor.call({
        input: fullMessage,
      });

      return {
        success: true,
        response: result.output,
        toolsUsed: this.extractToolsUsed(result)
      };
    } catch (error) {
      console.error('Agent processing error:', error);
      
      // Provide helpful fallback responses
      if (error.message.includes('API key') || error.message.includes('OpenAI')) {
        return {
          success: false,
          error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
          response: "I'm having trouble connecting to my AI services. Please make sure the OpenAI API key is properly configured."
        };
      }

      return {
        success: false,
        error: error.message,
        response: "I encountered an error while processing your request. Please try again or rephrase your question."
      };
    }
  }

  /**
   * Extract information about tools used during execution
   */
  extractToolsUsed(result) {
    // This would be enhanced to track which tools were actually used
    return result.toolsUsed || [];
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      initialized: this.initialized,
      toolsAvailable: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description
      })),
      modelInfo: {
        name: "gpt-4o-mini",
        provider: "OpenAI"
      }
    };
  }

  /**
   * Reset conversation context
   */
  resetContext() {
    // This could be enhanced to clear any persistent context
    console.log('🔄 Agent context reset');
  }
}

// Singleton instance
let agentInstance = null;

/**
 * Get or create agent instance
 */
function getAgent() {
  if (!agentInstance) {
    agentInstance = new TwitterAgent();
  }
  return agentInstance;
}

module.exports = {
  TwitterAgent,
  getAgent
}; 