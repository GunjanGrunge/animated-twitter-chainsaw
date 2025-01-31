require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');
const tweetHistory = require('./tweetHistoryManager');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function postScheduledTweet(tweetIndex) {
  try {
    // Debug logging
    console.log('Current directory:', __dirname);
    console.log('Attempting to read schedule file...');
    
    const scheduleFile = await fs.readFile(
      path.join(__dirname, 'tweetSchedule.json'),
      'utf8'
    );
    
    console.log('Schedule file contents:', scheduleFile);
    
    const schedule = JSON.parse(scheduleFile);
    
    if (!schedule.tweets || !schedule.tweets[tweetIndex]) {
      console.log('No tweet found for index:', tweetIndex);
      console.log('Available tweets:', schedule.tweets);
      return;
    }

    const tweet = schedule.tweets[tweetIndex];
    console.log(`Posting scheduled tweet for index ${tweetIndex}:`, tweet.content);
    
    const response = await twitterClient.v2.tweet(tweet.content);
    await tweetHistory.saveTweet(tweet);
    
    console.log('Tweet posted successfully:', response.data.id);
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const tweetIndex = parseInt(process.argv[2] || 0);
  postScheduledTweet(tweetIndex).catch(console.error);
}
