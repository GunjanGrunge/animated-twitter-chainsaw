require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');
const tweetHistory = require('./tweetHistoryManager');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TWEET_CATEGORIES = {
  POEM: "Write a short, emotional poem or Hindi shayari about love, life, or struggle in exactly one tweet length (under 280 characters). No lists or multiple versions.",
  MOTIVATIONAL: "Create a powerful motivational message that inspires action and determination. Use diverse sentence structures - mix short punchy statements with eloquent metaphors. Avoid clichés and common phrases like 'you can do it' or 'never give up'. Instead, use fresh perspectives, unexpected analogies, or storytelling elements. Focus on themes like growth, courage, persistence, or innovation. Keep it under 280 characters and make it memorable.",
  JOKE: "Craft a brilliant wordplay or double meanings that is funny, sarcastic and witty in under 280 characters.",
  INSPIRATIONAL: "Create a unique and powerful inspirational message about personal growth, resilience, or self-discovery. Be creative with different openings - avoid starting with 'Embrace'. Mix metaphors, use varied narrative voices, and explore different emotional tones while staying authentic and meaningful. Keep it under 280 characters.",
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
  const maxAttempts = 13;  // We try 13 times before giving up

  while (attempts < maxAttempts) {
    console.log(`\nAttempt ${attempts + 1}/${maxAttempts} for category ${category}`);
    
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
    console.log(`Found ${similarTweets.length} similar tweets`);
    
    if (similarTweets.length > 0) {
      console.log('Similar tweets found:');
      similarTweets.forEach((oldTweet, index) => {
        console.log(`\n${index + 1}. Old tweet (${oldTweet.category}, ${oldTweet.createdAt}):`);
        console.log(oldTweet.content);
        const similarity = calculateSimilarity(oldTweet.content, tweet);
        console.log(`Similarity score: ${(similarity * 100).toFixed(2)}%`);
      });
      attempts++;
      continue;
    }

    console.log('Unique tweet generated successfully');
    return tweet;
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

// Update main execution to remove MongoDB
if (require.main === module) {
  (async () => {
    try {
      await generateTweetSchedule();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
