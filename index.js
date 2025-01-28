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
  MOTIVATIONAL: "Create an original, powerful motivational quote under 280 characters.",
  JOKE: "Create a clever, witty joke or wordplay that's fun and non-offensive in under 280 characters.",
  INSPIRATIONAL: "Generate an original inspirational quote about personal growth in under 280 characters.",
  GEETA: "Generate tweetable insights inspired by the Bhagavad Gita. Focus on practical life lessons, such as self-discipline, mindfulness, resilience, and the importance of effort over outcomes. The tone should be motivational, relatable, and diverse in structure and content."
};

function getRandomCategory() {
  const categories = Object.keys(TWEET_CATEGORIES);
  return categories[Math.floor(Math.random() * categories.length)];
}

// Add this function at the top level
function getNextTweetTime() {
  return new Date(Date.now() + 15 * 60000).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long'
  });
}

async function generateAndPostTweet() {
  try {
    const selectedCategory = getRandomCategory();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    // Clean the tweet: remove quotes, hashtags, and trailing spaces
    let tweet = completion.choices[0].message.content
      .replace(/["'"]/g, '') // Remove quotes
      .replace(/#\w+/g, '')  // Remove hashtags
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim();               // Remove leading/trailing spaces

    const istTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    console.log('\n=== Tweet Details ===');
    console.log('Category:', selectedCategory);
    console.log('Time (IST):', istTime);
    console.log('Generated Tweet:', tweet);

    // Post clean tweet to Twitter
    const response = await twitterClient.v2.tweet(tweet);
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', response.data.id);
    console.log('Tweet URL:', `https://twitter.com/user/status/${response.data.id}`);
    console.log('Current Time (IST):', istTime);
    console.log('Next Tweet Time (IST):', getNextTweetTime());
    console.log('==================\n');
    return tweet;
  } catch (error) {
    console.error('Error in generate and post tweet:', error);
  }
}

function getRandomDelay(start, end) {
  // Generate random delay between 60-180 minutes
  return Math.floor(Math.random() * (180 - 60 + 1) + 60) * 60000;
}

async function scheduleTweetsForSession() {
  const session = process.env.SESSION || 'morning';
  const tweetsToGenerate = 5;
  
  console.log(`\n=== Starting ${session} tweet session ===`);
  
  for (let i = 0; i < tweetsToGenerate; i++) {
    const delay = getRandomDelay();
    console.log(`Waiting ${Math.floor(delay/60000)} minutes before next tweet...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await generateAndPostTweet();
  }
}

// Replace the cron schedule with one-time execution
(async () => {
  const isVerified = await verifyTwitterCredentials();
  if (isVerified) {
    console.log('\n=== Tweet Session Started ===');
    console.log('Current Time (IST):', new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    }));
    
    await scheduleTweetsForSession();
    console.log('Tweet session completed');
    process.exit(0);
  } else {
    console.error('Cannot start tweeting due to verification failure');
    process.exit(1);
  }
})();

// Remove the cron schedule and keep only the generateAndPostTweet function
// ...rest of the existing code...
