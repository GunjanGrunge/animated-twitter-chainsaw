require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function postScheduledTweet(tweetIndex) {
  try {
    const scheduleFile = await fs.readFile(
      path.join(__dirname, 'tweetSchedule.json'),
      'utf8'
    );
    const schedule = JSON.parse(scheduleFile);
    
    if (!schedule[tweetIndex]) {
      console.log('No tweet found for index:', tweetIndex);
      return;
    }

    const tweet = schedule[tweetIndex];
    console.log(`Posting scheduled tweet: ${tweet.content}`);
    
    const response = await twitterClient.v2.tweet(tweet.content);
    console.log('Tweet posted successfully:', response.data.id);
  } catch (error) {
    console.error('Error posting tweet:', error);
    process.exit(1);
  }
}

module.exports = { postScheduledTweet };

// Run if called directly
if (require.main === module) {
  const tweetIndex = parseInt(process.argv[2] || 0);
  postScheduledTweet(tweetIndex).catch(console.error);
}
