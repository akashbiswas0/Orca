const { Tool } = require("langchain/tools");
const axios = require('axios');

/**
 * Twitter Replies Tool for LangChain Agent
 * This tool allows the agent to fetch replies for Twitter/X posts
 */
class TwitterRepliesTool extends Tool {
  constructor(apiBaseUrl = 'http://localhost:3001') {
    super();
    this.name = "twitter_replies_fetcher";
    this.description = `Use this tool to fetch replies/comments for a Twitter or X post. 
    Input should be a Twitter/X URL (e.g., https://x.com/username/status/1234567890) or just the tweet URL.
    The tool will extract the tweet ID and return all replies with user information and engagement stats.
    This is useful when users ask about:
    - "What are people saying about this tweet?"
    - "Get replies for this post"
    - "Show me comments on this Twitter post"
    - "Fetch responses to this tweet"`;
    
    this.apiBaseUrl = apiBaseUrl;
  }

  async _call(input) {
    try {
      return await this.fetchTwitterReplies(input);
    } catch (error) {
      return `Error fetching Twitter replies: ${error.message}`;
    }
  }

  /**
   * Extract Twitter URL from various input formats
   */
  extractTwitterUrl(input) {
    // If input is already a valid Twitter URL, return it
    const twitterUrlPattern = /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    const match = input.match(twitterUrlPattern);
    
    if (match) {
      return match[0];
    }
    
    // If no URL found, assume the entire input might be a URL
    if (input.includes('twitter.com') || input.includes('x.com')) {
      return input.trim();
    }
    
    throw new Error('Please provide a valid Twitter/X URL');
  }

  /**
   * Fetch replies from the Twitter API
   */
  async fetchTwitterReplies(input, count = 20) {
    try {
      const twitterUrl = this.extractTwitterUrl(input);
      
      const response = await axios.post(`${this.apiBaseUrl}/api/twitter/replies`, {
        url: twitterUrl,
        count: count
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.success) {
        return this.formatRepliesForAgent(response.data.data);
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch replies');
      }
    } catch (error) {
      if (error.response) {
        // API returned an error response
        const errorMsg = error.response.data?.error?.message || 'API request failed';
        throw new Error(`API Error: ${errorMsg}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error: Unable to connect to Twitter API service');
      } else {
        // Other error
        throw new Error(error.message);
      }
    }
  }

  /**
   * Format replies data for the agent to understand and present to users
   */
  formatRepliesForAgent(data) {
    const { tweetId, totalReplies, replies } = data;
    
    if (totalReplies === 0) {
      return `No replies found for tweet ID ${tweetId}. The tweet might be new, have no replies, or the replies might be restricted.`;
    }

    let summary = `Found ${totalReplies} reply${totalReplies > 1 ? 'ies' : ''} for tweet ID ${tweetId}:\n\n`;
    
    replies.forEach((reply, index) => {
      const user = reply.user;
      const stats = reply.stats;
      
      summary += `${index + 1}. **@${user.username}** (${user.displayName})${user.verified ? ' ✓' : ''}\n`;
      summary += `   "${reply.text}"\n`;
      summary += `   💬 ${stats.replies} | 🔄 ${stats.retweets} | ❤️ ${stats.likes} | 👁️ ${stats.views}\n`;
      summary += `   Posted: ${new Date(reply.createdAt).toLocaleString()}\n\n`;
    });

    // Add insights
    if (replies.length > 0) {
      const topReply = replies.reduce((prev, current) => 
        (prev.stats.likes + prev.stats.retweets) > (current.stats.likes + current.stats.retweets) ? prev : current
      );
      
      summary += `📊 **Top engaging reply:** "${topReply.text}" by @${topReply.user.username} with ${topReply.stats.likes} likes and ${topReply.stats.retweets} retweets.`;
    }

    return summary;
  }
}

module.exports = TwitterRepliesTool; 