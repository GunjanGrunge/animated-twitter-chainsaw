const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    const username = encodeURIComponent(process.env.MONGODB_USERNAME);
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
    const cluster = process.env.MONGODB_CLUSTER;
    
    // Simplified connection string
    const uri = `mongodb+srv://${username}:${password}@${cluster}`;
    
    // Updated options with SSL configuration
    const options = {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      ssl: true,
      tls: true,
      tlsInsecure: true, // For GitHub Actions environment
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
    };
    
    console.log('Initializing MongoDB connection...');
    this.client = new MongoClient(uri, options);
    this.db = null;
  }

  async connect() {
    try {
      console.log('Attempting MongoDB connection...');
      await this.client.connect();
      await this.client.db("admin").command({ ping: 1 });
      this.db = this.client.db('tweets');
      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('Detailed MongoDB connection error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        cause: error.cause ? error.cause.message : 'No cause specified'
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
