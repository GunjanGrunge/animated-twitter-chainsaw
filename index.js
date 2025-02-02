require('dotenv').config();
const OpenAI = require('openai');
const { TwitterApi } = require('twitter-api-v2');

// Validate environment variables
if (!process.env.OPENAI_API_KEY || !process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
    !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
  throw new Error('Missing required environment variables');
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Twitter Client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Verify Twitter credentials
async function verifyTwitterCredentials() {
  try {
    const currentUser = await twitterClient.v2.me();
    console.log('Twitter API Verification Successful!');
    console.log('Connected Account:', currentUser.data);
    return true;
  } catch (error) {
    console.error('Twitter API Verification Failed:', error);
    return false;
  }
}

const TWEET_CATEGORIES = {
  POEM: "Write a short, emotional poem or Hindi shayari about love, life, or struggle in under 280 characters.",
  MOTIVATIONAL: "Create a powerful motivational message that inspires action and determination. Use diverse sentence structures - mix short punchy statements with eloquent metaphors. Avoid clichés and common phrases like 'you can do it' or 'never give up'. Instead, use fresh perspectives, unexpected analogies, or storytelling elements. Focus on themes like growth, courage, persistence, or innovation. Keep it under 280 characters and make it memorable.",
  JOKE: "Craft a clever joke with brilliant wordplay, puns, or double meanings that is funny, witty in under 280 characters.",
  INSPIRATIONAL: "Create a unique and powerful inspirational message about personal growth, resilience, or self-discovery. Be creative with different openings - avoid starting with 'Embrace'. Mix metaphors, use varied narrative voices, and explore different emotional tones while staying authentic and meaningful. Keep it under 280 characters.",
  GEETA: "Share profound life lessons and principles inspired by the wisdom of the Bhagavad Gita. Focus on teachings about self-discipline, resilience, karma, duty, detachment, and inner peace. Express the essence of these teachings in a relatable and practical way without directly quoting or referencing specific verses or figures in under 280 characters."
};

function getRandomCategory() {
  const categories = Object.keys(TWEET_CATEGORIES);
  return categories[Math.floor(Math.random() * categories.length)];
}

async function generateAndPostTweet() {
  try {
    const selectedCategory = getRandomCategory();
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    // Verify if we're within the valid time window (6 hours from start)
    const now = new Date();
    const startTime = process.env.BATCH_START_TIME || '0830';
    const [startHour, startMinute] = startTime.match(/(\d{2})(\d{2})/).slice(1).map(Number);
    const sessionStart = new Date(now);
    sessionStart.setHours(startHour, startMinute, 0);
    
    if (now.getTime() - sessionStart.getTime() > 6 * 60 * 60 * 1000) {
      console.error('Outside valid time window for tweeting');
      process.exit(1);
    }

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

    let tweet = completion.choices[0].message.content
      .replace(/["'"]/g, '')
      .replace(/#\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const istTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    console.log('\n=== Tweet Details ===');
    console.log('Category:', selectedCategory);
    console.log('Time (IST):', istTime);
    console.log('Generated Tweet:', tweet);

    const response = await twitterClient.v2.tweet(tweet);
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', response.data.id);
    console.log('Tweet URL:', `https://twitter.com/user/status/${response.data.id}`);
    console.log('==================\n');
    return tweet;
  } catch (error) {
    console.error('Error in generate and post tweet:', error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  const isVerified = await verifyTwitterCredentials();
  if (isVerified) {
    await generateAndPostTweet();
    process.exit(0);
  } else {
    console.error('Cannot start tweeting due to verification failure');
    process.exit(1);
  }
})();
