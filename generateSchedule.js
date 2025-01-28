require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TWEET_CATEGORIES = {
  POEM: "Write a short, emotional poem or Hindi shayari about love, life, or struggle in under 280 characters.",
  MOTIVATIONAL: "Create an original, powerful motivational quote under 280 characters.",
  JOKE: "Create a clever, witty joke or wordplay that's fun and non-offensive in under 280 characters.",
  INSPIRATIONAL: "Generate an original inspirational quote about personal growth in under 280 characters.",
  GEETA: "Generate tweetable insights inspired by the Bhagavad Gita. Focus on practical life lessons, such as self-discipline, mindfulness, resilience, and the importance of effort over outcomes. The tone should be motivational, relatable, and diverse in structure and content."
};

function getRandomCategory() {
  const categories = Object.keys(TWEET_CATEGORIES);
  return categories[Math.floor(Math.random() * categories.length)];
}

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
  const selectedCategory = getRandomCategory();
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a tweet generator specializing in ${selectedCategory.toLowerCase()} content. Create engaging and authentic tweets. Do not use quotes, hashtags, or emojis. Keep it simple and direct.`
      },
      {
        role: "user",
        content: TWEET_CATEGORIES[selectedCategory]
      }
    ]
  });
  
  return completion.choices[0].message.content
    .replace(/["'"]/g, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { generateTweetSchedule };

// Run if called directly
if (require.main === module) {
  generateTweetSchedule().catch(console.error);
}
