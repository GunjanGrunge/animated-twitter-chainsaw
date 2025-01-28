require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateTweetSchedule() {
  const tweets = [];
  const now = new Date();
  const baseTime = now.getTime();
  
  // Generate 2 tweets for testing (can be changed to 5 for production)
  for(let i = 0; i < 2; i++) {
    const tweetTime = new Date(baseTime + (i * 30 * 60 * 1000)); // 30 min intervals
    const tweet = await generateTweet();
    tweets.push({
      scheduledTime: tweetTime.toISOString(),
      content: tweet
    });
  }

  await fs.writeFile(
    path.join(__dirname, 'tweetSchedule.json'), 
    JSON.stringify(tweets, null, 2)
  );
  
  console.log('Tweet schedule generated:', tweets);
  return tweets;
}

async function generateTweet() {
  // Using your existing tweet generation logic
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Generate a short, engaging tweet about technology."
      },
      {
        role: "user",
        content: "Write a tweet under 280 characters."
      }
    ]
  });
  
  return completion.choices[0].message.content.trim();
}

module.exports = { generateTweetSchedule };

// Run if called directly
if (require.main === module) {
  generateTweetSchedule().catch(console.error);
}
