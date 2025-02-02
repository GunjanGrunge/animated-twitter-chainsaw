const fs = require('fs').promises;
const path = require('path');

class TweetHistoryManager {
  constructor() {
    this.historyFile = path.join(__dirname, 'tweetHistory.json');
    this.similarityThreshold = 0.7; // 70% similarity threshold
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data).tweets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // If file doesn't exist, create it
        await this.saveHistory({ tweets: [] });
        return [];
      }
      throw error;
    }
  }

  async saveHistory(history) {
    try {
      console.log('Saving tweet history:', {
        location: this.historyFile,
        tweetCount: history.tweets.length,
        firstTweet: history.tweets[0]?.content.substring(0, 50),
        lastTweet: history.tweets[history.tweets.length - 1]?.content.substring(0, 50)
      });
      
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
      console.log('Tweet history saved successfully');
      
      // Verify the file was written
      const stats = await fs.stat(this.historyFile);
      console.log(`History file size: ${stats.size} bytes`);
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  }

  async saveTweet(tweet) {
    const history = await this.loadHistory();
    history.push({
      content: tweet.content,
      category: tweet.category,
      createdAt: new Date().toISOString(),
      session: tweet.session
    });

    // Keep only last 90 days of tweets
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const filteredHistory = {
      tweets: history.filter(t => new Date(t.createdAt) > ninetyDaysAgo)
    };

    await this.saveHistory(filteredHistory);
    console.log(`Tweet saved to history. Total tweets in history: ${filteredHistory.tweets.length}`);
    return true;
  }

  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  async findSimilarTweets(content) {
    const history = await this.loadHistory();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentTweets = history.filter(t => new Date(t.createdAt) > ninetyDaysAgo);
    
    console.log(`Checking similarity against ${recentTweets.length} tweets from the last 90 days`);
    
    const similarTweets = recentTweets.filter(tweet => {
      const similarity = this.calculateSimilarity(tweet.content, content);
      if (similarity > this.similarityThreshold) {
        console.log(`Found similar tweet:\nNew: ${content}\nOld: ${tweet.content}\nSimilarity: ${similarity}`);
      }
      return similarity > this.similarityThreshold;
    });

    return similarTweets;
  }
}

module.exports = new TweetHistoryManager();
