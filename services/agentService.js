const { ChatOpenAI } = require("@langchain/openai");
const { initializeAgentExecutorWithOptions } = require("langchain/agents");
const TwitterRepliesTool = require('../tools/twitterTool');

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
        modelName: "gpt-3.5-turbo",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Initialize tools
      this.tools = [
        new TwitterRepliesTool()
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
    return `You are a helpful Twitter analysis assistant. Your main capability is to fetch and analyze replies to Twitter/X posts.

**Your capabilities:**
- Fetch replies/comments for any Twitter or X post URL
- Analyze sentiment and engagement of replies
- Provide insights about the conversation
- Identify trending topics in replies
- Summarize key points from the discussion

**How to use your tools:**
- When users provide a Twitter/X URL or ask about replies to a tweet, use the twitter_replies_fetcher tool
- Always provide clear summaries and insights
- Format your responses in a user-friendly way with emojis and clear structure

**Guidelines:**
- Be conversational and helpful
- Provide context and insights, not just raw data
- If a URL is invalid or no replies are found, explain this clearly
- Suggest relevant follow-up questions or actions
- Keep responses engaging and informative

**Example interactions:**
- User: "What are people saying about https://x.com/user/status/123456?"
- User: "Analyze the replies to this tweet: [URL]"
- User: "Get me the top comments on this post"
- User: "What's the sentiment of replies to this Twitter post?"

Remember: Always use the tool when users ask about Twitter replies or provide Twitter URLs. Be proactive in offering insights and analysis.`;
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
        name: "gpt-3.5-turbo",
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