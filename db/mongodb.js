const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: true, // For development, adjust for production
      retryWrites: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000
    };
    
    this.client = new MongoClient(process.env.MONGODB_URI, options);
    this.db = null;
  }

  async connect() {
    try {
      console.log('Attempting MongoDB connection...');
      await this.client.connect();
      this.db = this.client.db('tweets');
      await this.db.command({ ping: 1 }); // Test the connection
      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
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
