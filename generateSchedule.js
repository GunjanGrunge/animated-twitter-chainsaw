require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');
const mongodb = require('./db/mongodb');
const tweetHistory = require('./tweetHistoryManager');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TWEET_CATEGORIES = {
  POEM: "Write a short, emotional poem or Hindi shayari about love, life, or struggle in exactly one tweet length (under 280 characters). No lists or multiple versions.",
  MOTIVATIONAL: "Create one short motivational quote under 280 characters. Be concise and impactful. No lists.",
  JOKE: "Craft a brilliant wordplay or double meanings that is funny, sarcastic and witty in under 280 characters.",
  INSPIRATIONAL: "Write one inspirational message about personal growth in under 280 characters. Single message only, no lists.",
  GEETA: "Share profound life lessons and principles inspired by the wisdom of the Bhagavad Gita. Focus on teachings about self-discipline, resilience, karma, duty, detachment, and inner peace. Express the essence of these teachings in a relatable and practical way without directly quoting or referencing specific verses or figures in under 280 characters. No lists or multiple points."
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
  
  // Generate 4 tweets per session with different categories
  for(let i = 0; i < 4; i++) {
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
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
      temperature: 0.1,
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

    // Check for similar tweets
    const similarTweets = await tweetHistory.findSimilarTweets(tweet);
    const isSimilar = similarTweets.some(oldTweet => {
      const similarity = calculateSimilarity(oldTweet.content, tweet);
      return similarity > 0.7; // 70% similarity threshold
    });

    if (!isSimilar) {
      return tweet;
    }

    attempts++;
  }

  throw new Error('Could not generate unique tweet after maximum attempts');
}

function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(' '));
  const set2 = new Set(str2.toLowerCase().split(' '));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

module.exports = { generateTweetSchedule };

// Modify main execution
if (require.main === module) {
  (async () => {
    try {
      await mongodb.connect();
      await generateTweetSchedule();
      await mongodb.close();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
