require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TWEET_CATEGORIES = {
  POEM: "Write a single short poem or Hindi shayari about life in exactly one tweet length (under 280 characters). No lists or multiple versions.",
  MOTIVATIONAL: "Create one short motivational quote under 280 characters. Be concise and impactful. No lists.",
  JOKE: "Tell one short, clever joke that fits in a single tweet (under 280 characters). No lists or multiple jokes.",
  INSPIRATIONAL: "Write one inspirational message about personal growth in under 280 characters. Single message only, no lists.",
  GEETA: "Share one single Bhagavad Gita insight in under 280 characters. Focus on one lesson only. No lists or multiple points."
};

function getRandomCategory(usedCategories = []) {
  const categories = Object.keys(TWEET_CATEGORIES)
    .filter(cat => !usedCategories.includes(cat));
  return categories[Math.floor(Math.random() * categories.length)];
}

async function generateTweetSchedule() {
  const tweets = [];
  const now = new Date();
  const session = process.env.SESSION || 'morning';
  const baseTime = now.getTime();
  const usedCategories = [];
  
  // Generate 2 tweets per session with different categories
  for(let i = 0; i < 2; i++) {
    const tweetTime = new Date(baseTime + (i * 30 * 60 * 1000));
    const selectedCategory = getRandomCategory(usedCategories);
    usedCategories.push(selectedCategory);
    
    const tweet = await generateTweet(selectedCategory);
    tweets.push({
      scheduledTime: tweetTime.toISOString(),
      content: tweet,
      category: selectedCategory,
      session: session,
      index: i
    });
  }

  await fs.writeFile(
    path.join(__dirname, 'tweetSchedule.json'), 
    JSON.stringify({
      session: session,
      generatedAt: now.toISOString(),
      tweets: tweets
    }, null, 2)
  );
  
  console.log(`Tweet schedule generated for ${session} session:`, tweets);
  return tweets;
}

async function generateTweet(category) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a tweet writer. Create ONE single tweet under 280 characters. No lists, no multiple versions. Be concise and direct."
      },
      {
        role: "user",
        content: TWEET_CATEGORIES[category]
      }
    ],
    max_tokens: 100  // Limit token length to ensure shorter responses
  });
  
  let tweet = completion.choices[0].message.content
    .replace(/["'"]/g, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\d+\.\s/g, '')  // Remove numbered lists
    .trim();
    
  // Ensure tweet is within limits
  if (tweet.length > 280) {
    tweet = tweet.substring(0, 277) + "...";
  }
  
  return tweet;
}

module.exports = { generateTweetSchedule };

// Run if called directly
if (require.main === module) {
  generateTweetSchedule().catch(console.error);
}
