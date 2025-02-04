const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');
const logger = require('./utils/logger');

class TweetHistoryManager {
  constructor() {
    this.historyFile = path.join(__dirname, 'tweetHistory.json');
    this.backupDir = path.join(__dirname, 'backups');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating backup directory:', error);
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `history-${timestamp}.json`);
      await fs.copyFile(this.historyFile, backupFile);
      logger.info('Created history backup', { backupFile });

      // Clean up old backups (keep last 10)
      const files = await fs.readdir(this.backupDir);
      if (files.length > 10) {
        const oldestFile = files.sort()[0];
        await fs.unlink(path.join(this.backupDir, oldestFile));
        logger.info('Cleaned up old backup', { file: oldestFile });
      }
    } catch (error) {
      logger.error('Backup creation failed:', error);
    }
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      const history = JSON.parse(data);
      
      if (!history.tweets || !Array.isArray(history.tweets)) {
        logger.warn('Invalid history format, initializing new history');
        return [];
      }
      
      return history.tweets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No history file found, starting fresh');
        return [];
      }
      logger.error('Error loading history:', error);
      return [];
    }
  }

  async saveHistory(tweets) {
    try {
      // Validate tweets before saving
      const validTweets = tweets.filter(tweet => {
        const isValid = this.validateTweet(tweet);
        if (!isValid) {
          logger.warn('Invalid tweet found, filtering out:', { tweet });
        }
        return isValid;
      });

      // Create backup before saving
      await this.createBackup();

      await fs.writeFile(
        this.historyFile,
        JSON.stringify({
          tweets: validTweets,
          lastCleanup: new Date().toISOString(),
          totalTweets: validTweets.length
        }, null, 2)
      );
      
      logger.info('History saved successfully', { tweetCount: validTweets.length });
    } catch (error) {
      logger.error('Error saving history:', error);
      throw error;
    }
  }

  validateTweet(tweet) {
    return tweet 
      && typeof tweet === 'object'
      && typeof tweet.content === 'string'
      && tweet.content.length > 0
      && tweet.content.length <= 280
      && typeof tweet.category === 'string'
      && tweet.createdAt
      && !isNaN(new Date(tweet.createdAt).getTime());
  }

  async saveTweet(tweet) {
    try {
      const history = await this.loadHistory();
      
      // Validate tweet before saving
      if (!this.validateTweet(tweet)) {
        throw new Error('Invalid tweet format');
      }

      // Check for duplicates within last 24 hours
      const recentDuplicates = await this.findSimilarTweets(tweet.content, 0.9);
      if (recentDuplicates.length > 0) {
        logger.warn('Duplicate tweet detected', { tweet, similar: recentDuplicates });
        throw new Error('Similar tweet posted recently');
      }

      history.push({
        ...tweet,
        createdAt: new Date().toISOString()
      });
      
      // Clean up old tweets (older than 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const cleanedHistory = history.filter(t => {
        const keepTweet = new Date(t.createdAt) > ninetyDaysAgo;
        if (!keepTweet) {
          logger.info('Removing old tweet', { tweet: t });
        }
        return keepTweet;
      });
      
      await this.saveHistory(cleanedHistory);
      logger.info('Tweet saved successfully', { tweet });
    } catch (error) {
      logger.error('Error saving tweet:', error);
      throw error;
    }
  }

  async findSimilarTweets(newTweet, threshold = 0.7) {
    try {
      const history = await this.loadHistory();
      const tokenizer = new natural.WordTokenizer();
      const newTokens = tokenizer.tokenize(newTweet.toLowerCase());
      
      return history.filter(historicTweet => {
        try {
          const historicTokens = tokenizer.tokenize(historicTweet.content.toLowerCase());
          const similarity = natural.JaroWinklerDistance(
            newTokens.join(' '),
            historicTokens.join(' ')
          );
          return similarity > threshold;
        } catch (error) {
          logger.error('Error comparing tweets:', { 
            error, 
            newTweet, 
            historicTweet 
          });
          return false;
        }
      });
    } catch (error) {
      logger.error('Error finding similar tweets:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const history = await this.loadHistory();
      const categoryCounts = history.reduce((acc, tweet) => {
        acc[tweet.category] = (acc[tweet.category] || 0) + 1;
        return acc;
      }, {});

      return {
        totalTweets: history.length,
        categoryCounts,
        oldestTweet: history[0]?.createdAt,
        newestTweet: history[history.length - 1]?.createdAt
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return null;
    }
  }
}

module.exports = new TweetHistoryManager();
