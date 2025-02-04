require('dotenv').config();
const fs = require('fs').promises;
const OpenAI = require('openai');
const path = require('path');
const natural = require('natural');
const logger = require('./utils/logger');
const tweetHistory = require('./tweetHistoryManager');

class TweetGenerator {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.TWEET_CATEGORIES = {
      POEM: "Write a unique, emotional poem or Hindi shayari about love, life, or struggle. Be creative and avoid common phrases. Use metaphors and fresh perspectives. Each line should paint a vivid picture. Keep it under 280 characters.",
      MOTIVATIONAL: "Create a powerful motivational message that inspires action. Use unexpected metaphors and fresh analogies. Avoid clichés like 'never give up'. Instead, tell a micro-story or use nature-inspired imagery. Focus on unconventional aspects of growth, courage, or innovation. Keep it under 280 characters.",
      JOKE: "Create a clever, original joke with wordplay or situational humor. Avoid common setups and punchlines. Be creative with modern contexts or unexpected twists. Keep it under 280 characters.",
      INSPIRATIONAL: "Share a unique perspective on personal growth or self-discovery. Use creative metaphors or unexpected wisdom. Avoid starting with common phrases. Mix narrative styles and emotional depths while staying authentic. Keep it under 280 characters.",
      GEETA: "Share profound wisdom inspired by Bhagavad Gita principles in a modern context. Focus on practical applications of karma, duty, or inner peace. Use creative analogies to make ancient wisdom relevant today. Keep it under 280 characters."
    };
  }

  getRandomCategory(usedCategories = []) {
    const categories = Object.keys(this.TWEET_CATEGORIES)
      .filter(cat => !usedCategories.includes(cat));
    
    if (categories.length === 0) {
      logger.warn('All categories used, resetting used categories');
      return this.getRandomCategory();
    }
    
    return categories[Math.floor(Math.random() * categories.length)];
  }

  async generateTweet(category, retryCount = 0) {
    const maxRetries = 3;
    try {
      logger.info('Generating tweet', { category, attempt: retryCount + 1 });

      // Dynamic prompt enhancement based on category
      const categoryPrompts = {
        POEM: {
          styles: ['romantic', 'philosophical', 'nature-inspired', 'urban', 'nostalgic'],
          emotions: ['longing', 'joy', 'melancholy', 'hope', 'wonder'],
          structures: ['metaphorical', 'narrative', 'descriptive', 'reflective']
        },
        MOTIVATIONAL: {
          approaches: ['story-based', 'nature-metaphor', 'challenge-oriented', 'wisdom-sharing'],
          tones: ['empowering', 'thought-provoking', 'gentle-nudge', 'bold-call'],
          themes: ['personal-growth', 'resilience', 'innovation', 'self-discovery']
        },
        JOKE: {
          types: ['situational', 'wordplay', 'observational', 'paradoxical'],
          styles: ['clever', 'subtle', 'unexpected-twist', 'modern-context'],
          contexts: ['daily-life', 'technology', 'relationships', 'work-life']
        },
        INSPIRATIONAL: {
          perspectives: ['personal-journey', 'universal-truth', 'nature-wisdom', 'life-lessons'],
          approaches: ['storytelling', 'metaphorical', 'reflective', 'action-oriented'],
          depths: ['philosophical', 'practical', 'emotional', 'spiritual']
        },
        GEETA: {
          themes: ['karma', 'dharma', 'self-realization', 'detachment', 'purpose'],
          contexts: ['modern-life', 'relationships', 'work-ethics', 'personal-growth'],
          approaches: ['metaphorical', 'practical-wisdom', 'contemplative', 'action-oriented']
        }
      };

      // Select random elements for variety
      const categoryConfig = categoryPrompts[category];
      const style = categoryConfig[Object.keys(categoryConfig)[0]][Math.floor(Math.random() * categoryConfig[Object.keys(categoryConfig)[0]].length)];
      const secondaryElement = categoryConfig[Object.keys(categoryConfig)[1]][Math.floor(Math.random() * categoryConfig[Object.keys(categoryConfig)[1]].length)];
      const approach = categoryConfig[Object.keys(categoryConfig)[2]][Math.floor(Math.random() * categoryConfig[Object.keys(categoryConfig)[2]].length)];

      // Enhanced system prompt with specific style guidance
      const systemPrompt = `You are a creative tweet generator specializing in ${category.toLowerCase()} content. 
        Create a unique ${style} tweet with a ${secondaryElement} undertone using a ${approach} approach.
        Avoid clichés, common patterns, and typical phrases.
        Each tweet should feel fresh, original, and deeply connected to its theme.
        Do not use hashtags, quotes, or emojis.
        Consider the following guidelines:
        - Use unexpected word combinations
        - Create vivid imagery
        - Maintain authenticity
        - Avoid overused metaphors
        - Keep it concise but impactful`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `${this.TWEET_CATEGORIES[category]} Style: ${style}, Focus: ${secondaryElement}, Approach: ${approach}`
          }
        ],
        temperature: 0.9,
        presence_penalty: 0.8,  // Increased to further reduce repetition
        frequency_penalty: 0.9,  // Increased to encourage more unique word choices
        max_tokens: 100
      });

      let tweet = completion.choices[0].message.content
        .replace(/["'"]/g, '')
        .replace(/#[^\s#]+/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\d+\.\s/g, '')
        .trim();

      // Ensure tweet length
      if (tweet.length > 280) {
        tweet = tweet.substring(0, 277) + "...";
      }

      // Additional validation for creativity
      const creativityChecks = {
        hasCommonPhrases: this.checkCommonPhrases(tweet),
        hasRepetitiveStructure: this.checkRepetitiveStructure(tweet),
        meetsStyleCriteria: this.checkStyleCriteria(tweet, style, category)
      };

      if (Object.values(creativityChecks).some(check => !check)) {
        logger.warn('Tweet failed creativity checks', { creativityChecks });
        if (retryCount < maxRetries) {
          return this.generateTweet(category, retryCount + 1);
        }
      }

      // Check for similar tweets with stricter threshold
      const similarTweets = await tweetHistory.findSimilarTweets(tweet, 0.6); // Lower threshold for stricter uniqueness
      if (similarTweets.length > 0) {
        logger.warn('Similar tweet found', { 
          tweet, 
          similarCount: similarTweets.length 
        });
        
        if (retryCount < maxRetries) {
          return this.generateTweet(category, retryCount + 1);
        }
        throw new Error('Could not generate unique tweet after max retries');
      }

      logger.info('Tweet generated successfully', { 
        category, 
        tweet,
        style,
        approach,
        secondaryElement
      });
      return tweet;

    } catch (error) {
      logger.error('Error generating tweet', { 
        category, 
        error: error.message,
        attempt: retryCount + 1 
      });

      if (retryCount < maxRetries) {
        logger.info('Retrying tweet generation');
        return this.generateTweet(category, retryCount + 1);
      }
      throw error;
    }
  }

  // Helper methods for creativity validation
  checkCommonPhrases(tweet) {
    const commonPhrases = [
      'never give up',
      'follow your dreams',
      'believe in yourself',
      'life is like',
      'always remember',
      'at the end of the day'
    ];
    return !commonPhrases.some(phrase => 
      tweet.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  checkRepetitiveStructure(tweet) {
    const structures = [
      /^Today.*/i,
      /^Always.*/i,
      /^Remember.*/i,
      /^Life is.*/i,
      /^When you.*/i
    ];
    return !structures.some(pattern => pattern.test(tweet));
  }

  checkStyleCriteria(tweet, style, category) {
    // Category-specific criteria
    const criteria = {
      POEM: tweet.includes(' like ') || tweet.includes(' as ') || /[,;]/.test(tweet), // Metaphors or proper structure
      MOTIVATIONAL: /\b(can|will|must|let's|now)\b/i.test(tweet), // Action words
      JOKE: tweet.includes('?') || tweet.includes('!') || /\b(when|why|what|how)\b/i.test(tweet), // Question or punchline structure
      INSPIRATIONAL: /\b(within|beyond|through|discover|journey)\b/i.test(tweet), // Depth-indicating words
      GEETA: /\b(truth|path|duty|peace|wisdom|karma)\b/i.test(tweet) // Philosophical terms
    };

    return criteria[category];
  }

  async generateSchedule() {
    try {
      const tweets = [];
      const now = new Date();
      const session = process.env.SESSION || 'morning';
      const baseTime = now.getTime();
      const usedCategories = [];
      
      logger.info('Starting schedule generation', { session });

      // Generate 4 tweets per session
      for(let i = 0; i < 4; i++) {
        const tweetTime = new Date(baseTime + (i * 30 * 60 * 1000));
        const selectedCategory = this.getRandomCategory(usedCategories);
        usedCategories.push(selectedCategory);
        
        const tweet = await this.generateTweet(selectedCategory);
        tweets.push({
          scheduledTime: tweetTime.toISOString(),
          content: tweet,
          category: selectedCategory,
          session: session,
          index: i,
          status: 'pending'
        });

        logger.info('Tweet scheduled', { 
          index: i, 
          category: selectedCategory, 
          scheduledTime: tweetTime 
        });
      }

      const schedule = {
        session,
        generatedAt: now.toISOString(),
        tweets
      };

      await fs.writeFile(
        path.join(__dirname, 'tweetSchedule.json'), 
        JSON.stringify(schedule, null, 2)
      );

      logger.info('Schedule generated successfully', { 
        tweetCount: tweets.length,
        session 
      });

      return tweets;

    } catch (error) {
      logger.error('Error generating schedule', { error: error.message });
      throw error;
    }
  }
}

// Create and export singleton instance
const generator = new TweetGenerator();

// Update main execution
if (require.main === module) {
  (async () => {
    try {
      await generator.generateSchedule();
    } catch (error) {
      logger.error('Schedule generation failed', { error: error.message });
      process.exit(1);
    }
  })();
}

module.exports = generator;
