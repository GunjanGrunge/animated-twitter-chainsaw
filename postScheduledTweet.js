require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');
const logger = require('./utils/logger');
const tweetHistory = require('./tweetHistoryManager');

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

      // Verify credentials first
      const credentialsValid = await this.verifyCredentials();
      if (!credentialsValid) {
        throw new Error('Twitter credentials verification failed');
      }

      // Load and validate schedule
      const schedule = await this.loadSchedule();
      if (!schedule.tweets || !schedule.tweets[tweetIndex]) {
        throw new Error(`No tweet found for index: ${tweetIndex}`);
      }

      const tweet = schedule.tweets[tweetIndex];
      
      // Verify tweet timing
      const scheduledTime = new Date(tweet.scheduledTime);
      const now = new Date();
      const timeDiff = Math.abs(now - scheduledTime);
      
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes window
        logger.warn('Tweet outside scheduled window', {
          scheduled: scheduledTime,
          current: now
        });
      }

      // Post tweet
      const response = await this.postTweet(tweet);
      
      // Update tweet status in schedule
      schedule.tweets[tweetIndex].status = 'completed';
      schedule.tweets[tweetIndex].postedAt = new Date().toISOString();
      schedule.tweets[tweetIndex].tweetId = response.data.id;
      await this.updateSchedule(schedule);

      // Save to history
      await tweetHistory.saveTweet(tweet);

      logger.info('Scheduled tweet posted successfully', {
        index: tweetIndex,
        tweetId: response.data.id
      });

      return response;

    } catch (error) {
      logger.error('Failed to post scheduled tweet', {
        error: error.message,
        tweetIndex
      });
      throw error;
    }
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
