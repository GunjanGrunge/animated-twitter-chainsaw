require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Import the generator instance
const generator = require('../generateSchedule');

class TweetTester {
  constructor() {
    this.testResultsFile = path.join(__dirname, 'test-results.json');
    this.results = {
      timestamp: new Date().toISOString(),
      tests: []
    };
  }

  async generateTestTweets(count = 3) {
    const categories = ['POEM', 'MOTIVATIONAL', 'JOKE', 'INSPIRATIONAL', 'GEETA'];
    
    for (const category of categories) {
      logger.info(`Testing category: ${category}`);
      console.log(`\n=== Testing ${category} ===`);
      
      const categoryResults = {
        category,
        tweets: []
      };

      for (let i = 0; i < count; i++) {
        try {
          // Use the generator instance
          const tweet = await generator.generateTweet(category);
          const testResult = this.analyzeTweet(tweet, category);
          
          categoryResults.tweets.push({
            content: tweet,
            analysis: testResult
          });

          console.log(`\nTweet ${i + 1}:`);
          console.log(tweet);
          console.log('\nAnalysis:');
          console.log(JSON.stringify(testResult, null, 2));

        } catch (error) {
          logger.error(`Error generating test tweet for ${category}`, { error: error.message });
          categoryResults.tweets.push({
            error: error.message
          });
        }
      }

      this.results.tests.push(categoryResults);
    }

    await this.saveResults();
    this.printSummary();
  }

  analyzeTweet(tweet, category) {
    const analysis = {
      length: tweet.length,
      wordCount: tweet.split(' ').length,
      hasCommonPhrases: !generator.checkCommonPhrases(tweet),
      hasRepetitiveStructure: !generator.checkRepetitiveStructure(tweet),
      meetsStyleCriteria: generator.checkStyleCriteria(tweet, '', category),
      characteristics: this.analyzeCharacteristics(tweet, category)
    };

    analysis.score = this.calculateScore(analysis);
    return analysis;
  }

  analyzeCharacteristics(tweet, category) {
    const characteristics = {
      hasMetaphors: /like|as|resembles/i.test(tweet),
      hasEmotionalWords: /love|heart|soul|feel|dream/i.test(tweet),
      hasActionWords: /can|will|must|let's|now/i.test(tweet),
      hasUniquePhrasing: !/(always|never|today|remember|life is)/i.test(tweet),
      complexity: this.analyzeComplexity(tweet)
    };

    // Category-specific analysis
    switch (category) {
      case 'POEM':
        characteristics.hasPoetryElements = /[,;]/.test(tweet) || this.hasRhythm(tweet);
        break;
      case 'JOKE':
        characteristics.hasPunchline = tweet.includes('?') || tweet.includes('!');
        break;
      case 'GEETA':
        characteristics.hasWisdomElements = /wisdom|truth|path|karma|dharma/i.test(tweet);
        break;
    }

    return characteristics;
  }

  analyzeComplexity(tweet) {
    const words = tweet.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    return {
      avgWordLength,
      hasComplexStructure: tweet.includes(',') || tweet.includes(';') || tweet.includes('-'),
      sentenceVariety: tweet.split(/[.!?]/).length > 1
    };
  }

  hasRhythm(tweet) {
    const words = tweet.split(' ');
    let rhythmScore = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].slice(-2) === words[i + 1].slice(-2)) {
        rhythmScore++;
      }
    }
    return rhythmScore > 0;
  }

  calculateScore(analysis) {
    let score = 100;
    
    if (analysis.length > 260) score -= 10;
    if (analysis.hasCommonPhrases) score -= 20;
    if (analysis.hasRepetitiveStructure) score -= 15;
    if (!analysis.meetsStyleCriteria) score -= 15;
    
    const characteristics = analysis.characteristics;
    if (!characteristics.hasUniquePhrasing) score -= 10;
    if (characteristics.complexity.avgWordLength < 4) score -= 5;
    if (!characteristics.complexity.hasComplexStructure) score -= 5;

    return Math.max(0, score);
  }

  async saveResults() {
    try {
      await fs.writeFile(
        this.testResultsFile,
        JSON.stringify(this.results, null, 2)
      );
      logger.info('Test results saved', { file: this.testResultsFile });
    } catch (error) {
      logger.error('Error saving test results', { error: error.message });
    }
  }

  printSummary() {
    console.log('\n=== Test Summary ===');
    for (const categoryTest of this.results.tests) {
      console.log(`\nCategory: ${categoryTest.category}`);
      
      const scores = categoryTest.tweets
        .filter(t => t.analysis)
        .map(t => t.analysis.score);
      
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      console.log(`Average Score: ${avgScore.toFixed(2)}`);
      console.log(`Successful Tweets: ${scores.length}`);
      console.log(`Failed Tweets: ${categoryTest.tweets.length - scores.length}`);
    }
  }

  async cleanup() {
    try {
      await fs.unlink(this.testResultsFile);
      logger.info('Test results file cleaned up');
    } catch (error) {
      logger.error('Error cleaning up test file', { error: error.message });
    }
  }
}

// Create test directory if it doesn't exist
async function ensureTestDirectory() {
  const testDir = path.join(__dirname);
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  (async () => {
    try {
      await ensureTestDirectory();
      const tester = new TweetTester();
      await tester.generateTestTweets(3);
      
      // Uncomment to automatically cleanup test results
      // await tester.cleanup();
      
    } catch (error) {
      logger.error('Test execution failed', { error: error.message });
      process.exit(1);
    }
  })();
}

module.exports = TweetTester; 