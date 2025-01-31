const { MongoClient } = require('mongodb');

class MongoDB {
  constructor() {
    const options = {
      ssl: true,
      tls: true,
      tlsCAFile: require('path').join(__dirname, '../rootCA.pem'), // Will add this file
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      directConnection: true,
      retryWrites: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    };
    
    console.log('MongoDB Options:', options);
    this.client = new MongoClient(process.env.MONGODB_URI, options);
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
        console.error('Ping failed:', pingError);
        throw pingError;
      }
    } catch (error) {
      console.error('MongoDB connection error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
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
