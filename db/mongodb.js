const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI, {
      ssl: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });
    this.db = null;
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db('tweets');
      console.log('Connected successfully to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async close() {
    await this.client.close();
  }

  async saveTweet(tweet) {
    const collection = this.db.collection('tweet_history');
    return await collection.insertOne({
      content: tweet.content,
      category: tweet.category,
      createdAt: new Date(),
      session: tweet.session
    });
  }

  async findSimilarTweets(content) {
    const collection = this.db.collection('tweet_history');
    // Get tweets from last 90 days
    return await collection.find({
      createdAt: { 
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      }
    }).toArray();
  }
}

module.exports = new MongoDB();
