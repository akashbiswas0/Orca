const https = require('https');

/**
 * Get replies for a specific tweet
 * @param {string} tweetId - The tweet ID
 * @param {number} count - Number of replies to fetch (default: 40)
 * @returns {Promise<Array>} Array of reply objects
 */
async function getTweetReplies(tweetId, count = 40) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: process.env.RAPIDAPI_HOST || 'twitter241.p.rapidapi.com',
      port: null,
      path: `/comments?pid=${tweetId}&count=${count}`,
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'twitter241.p.rapidapi.com'
      }
    };

    const req = https.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        try {
          const body = Buffer.concat(chunks);
          const data = JSON.parse(body.toString());

          if (res.statusCode !== 200) {
            reject(new Error(`API request failed with status ${res.statusCode}: ${data.message || 'Unknown error'}`));
            return;
          }

          // Parse the response to extract replies
          const replies = parseRepliesFromResponse(data);
          resolve(replies);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', function (error) {
      reject(new Error(`API request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Parse replies from the Twitter API response
 * @param {Object} apiResponse - Raw API response
 * @returns {Array} Cleaned array of reply objects
 */
function parseRepliesFromResponse(apiResponse) {
  const replies = [];

  try {
    // Navigate through the complex response structure
    if (apiResponse.result && apiResponse.result.instructions) {
      for (const instruction of apiResponse.result.instructions) {
        if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
          for (const entry of instruction.entries) {
            // Handle direct tweet entries
            if (entry.content && entry.content.itemContent && entry.content.itemContent.tweet_results) {
              const tweetData = entry.content.itemContent.tweet_results.result;
              if (tweetData && isReply(tweetData)) {
                replies.push(extractReplyData(tweetData));
              }
            }

            // Handle conversation thread entries
            if (entry.content && entry.content.items) {
              for (const item of entry.content.items) {
                if (item.item && item.item.itemContent && item.item.itemContent.tweet_results) {
                  const tweetData = item.item.itemContent.tweet_results.result;
                  if (tweetData && isReply(tweetData)) {
                    replies.push(extractReplyData(tweetData));
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing replies:', error);
  }

  return replies;
}

/**
 * Check if a tweet is a reply
 * @param {Object} tweetData - Tweet data object
 * @returns {boolean} True if it's a reply
 */
function isReply(tweetData) {
  return tweetData.legacy && 
         tweetData.legacy.in_reply_to_status_id_str && 
         tweetData.legacy.full_text;
}

/**
 * Extract relevant data from a reply tweet
 * @param {Object} tweetData - Tweet data object
 * @returns {Object} Cleaned reply object
 */
function extractReplyData(tweetData) {
  const user = tweetData.core && tweetData.core.user_results && tweetData.core.user_results.result;
  
  return {
    id: tweetData.rest_id,
    text: tweetData.legacy.full_text,
    createdAt: tweetData.legacy.created_at,
    user: {
      id: user ? user.rest_id : null,
      username: user && user.core ? user.core.screen_name : null,
      displayName: user && user.core ? user.core.name : null,
      avatar: user && user.avatar ? user.avatar.image_url : null,
      verified: user ? user.is_blue_verified : false
    },
    stats: {
      replies: tweetData.legacy.reply_count || 0,
      retweets: tweetData.legacy.retweet_count || 0,
      likes: tweetData.legacy.favorite_count || 0,
      views: tweetData.views && tweetData.views.count ? parseInt(tweetData.views.count) : 0
    },
    inReplyToStatusId: tweetData.legacy.in_reply_to_status_id_str,
    inReplyToUserId: tweetData.legacy.in_reply_to_user_id_str,
    inReplyToScreenName: tweetData.legacy.in_reply_to_screen_name
  };
}

module.exports = {
  getTweetReplies
}; 