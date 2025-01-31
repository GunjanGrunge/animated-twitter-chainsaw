const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    // Construct MongoDB URI with encoded credentials
    const username = encodeURIComponent("stdevilgunjan");
    const password = encodeURIComponent("9l3mS4egxMjfZYjC");
    const cluster = "dailytweets.f0ljl.mongodb.net";
    
    const uri = `mongodb+srv://${username}:${password}@${cluster}/tweets?authSource=admin&retryWrites=true&w=majority`;
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      directConnection: false,
      retryWrites: true,
      retryReads: true,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    console.log('Initializing MongoDB connection...');
    this.client = new MongoClient(uri, options);
    this.db = null;
  }

  async connect() {
    try {
      console.log('Attempting MongoDB connection...');
      await this.client.connect();
      this.db = this.client.db('tweets');
      
      // Test connection with explicit error handling
      try {
        await this.db.command({ ping: 1 });
        console.log('Successfully connected to MongoDB');
      } catch (pingError) {
        console.error('Ping failed:', {
          error: pingError.message,
          code: pingError.code,
          name: pingError.name
        });
        throw pingError;
      }
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
