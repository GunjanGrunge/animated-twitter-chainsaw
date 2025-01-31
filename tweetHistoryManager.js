const fs = require('fs').promises;
const path = require('path');

class TweetHistoryManager {
  constructor() {
    this.historyFile = path.join(__dirname, 'tweetHistory.json');
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data).tweets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.saveHistory({ tweets: [] });
        return [];
      }
      throw error;
    }
  }

  async saveHistory(history) {
    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
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
    return true;
  }

  async findSimilarTweets(content) {
    const history = await this.loadHistory();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return history.filter(t => new Date(t.createdAt) > ninetyDaysAgo);
  }
}

module.exports = new TweetHistoryManager();
