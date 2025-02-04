require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');
const logger = require('./utils/logger');
const tweetHistory = require('./tweetHistoryManager');

async function saveTweet(tweet) {
  try {
    // Ensure tweet has all required fields
    const tweetToSave = {
      content: tweet.content,
      category: tweet.category,
      createdAt: new Date().toISOString(),
      scheduledTime: tweet.scheduledTime,
      status: 'completed',
      tweetId: tweet.tweetId
    };

    await tweetHistory.saveTweet(tweetToSave);
    logger.info('Tweet saved to history successfully', { tweetId: tweet.tweetId });
    return true;
  } catch (error) {
    logger.error('Error saving tweet to history:', error);
    return false;
  }
}

class TweetPoster {
  constructor() {
    this.validateEnv();
    
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  validateEnv() {
    const requiredEnvVars = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_TOKEN_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  async verifyCredentials() {
    try {
      const user = await this.twitterClient.v2.me();
      logger.info('Twitter credentials verified', { username: user.data.username });
      return true;
    } catch (error) {
      logger.error('Twitter credential verification failed', { error: error.message });
      return false;
    }
  }

  async loadSchedule() {
    try {
      const scheduleFile = await fs.readFile(
        path.join(__dirname, 'tweetSchedule.json'),
        'utf8'
      );
      return JSON.parse(scheduleFile);
    } catch (error) {
      logger.error('Error loading schedule', { error: error.message });
      throw new Error('Failed to load tweet schedule');
    }
  }

  async updateSchedule(schedule) {
    try {
      await fs.writeFile(
        path.join(__dirname, 'tweetSchedule.json'),
        JSON.stringify(schedule, null, 2)
      );
      logger.info('Schedule updated successfully');
    } catch (error) {
      logger.error('Error updating schedule', { error: error.message });
      throw error;
    }
  }

  async postTweet(tweet) {
    try {
      const response = await this.twitterClient.v2.tweet(tweet.content);
      logger.info('Tweet posted successfully', { 
        tweetId: response.data.id,
        category: tweet.category 
      });
      return response;
    } catch (error) {
      logger.error('Error posting tweet', { 
        error: error.message,
        tweet: tweet.content 
      });
      throw error;
    }
  }

  async postScheduledTweet(tweetIndex) {
    try {
      logger.info('Starting scheduled tweet posting', { tweetIndex });

      const schedule = await this.loadSchedule();
      if (!schedule.tweets || !schedule.tweets[tweetIndex]) {
        throw new Error('Invalid schedule or tweet index');
      }

      const tweet = schedule.tweets[tweetIndex];
      
      // Verify credentials
      await this.verifyCredentials();

      // Post tweet
      const response = await this.postTweet(tweet);
      
      if (response) {
        // Update tweet with response data
        tweet.tweetId = response.data.id;
        tweet.status = 'completed';
        tweet.postedAt = new Date().toISOString();
        
        // Update schedule
        await this.updateSchedule(schedule);
        
        // Save to history
        await saveTweet(tweet);
        
        logger.info('Tweet posted and saved successfully', {
          tweetId: response.data.id,
          index: tweetIndex
        });
        
        return response;
      }

      throw new Error('No response from Twitter API');

    } catch (error) {
      logger.error('Failed to post scheduled tweet', {
        error: error.message,
        tweetIndex
      });
      return null;
    }
  }

  validateTweet(tweet) {
    return tweet 
      && typeof tweet === 'object'
      && typeof tweet.content === 'string'
      && tweet.content.length > 0
      && tweet.content.length <= 280
      && typeof tweet.category === 'string'
      && tweet.scheduledTime
      && !isNaN(new Date(tweet.scheduledTime).getTime());
  }
}

// Create and export singleton instance
const poster = new TweetPoster();

// Run if called directly
if (require.main === module) {
  const tweetIndex = parseInt(process.argv[2] || 0);
  poster.postScheduledTweet(tweetIndex)
    .catch(error => {
      logger.error('Script execution failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = poster;
