An automated Twitter bot that generates and posts diverse content using OpenAI GPT-4 and Twitter API, with local JSON-based tweet history to prevent duplicates.

## Features

- **Dual Daily Sessions**: 8:30 AM & 4:30 PM IST
- **4 Tweets Per Session**: Total 8 tweets daily
- **30-Minute Intervals**: Between tweets in each session
- **90-Day History**: Prevents similar tweets within a 90-day window using JSON storage
- **Similarity Check**: 70% similarity threshold for duplicate prevention
- **Multiple Attempts**: Up to 13 attempts to generate unique tweets
- **5 Tweet Categories**:
  - Poetry/Shayari (Hindi/English)
  - Motivational Quotes
  - Clever Jokes & Wordplay
  - Inspirational Messages
  - Bhagavad Gita Wisdom

## 10-point explanation of how the automated Twitter bot works:

- Scheduling:

Runs twice daily (8:30 AM & 4:30 PM IST)
Uses GitHub Actions for automation
Posts 4 tweets per session, 30 minutes apart

-Content Generation:

Uses OpenAI GPT-4 to generate unique tweets
Has 5 categories: Poems, Motivational, Jokes, Inspirational, Geeta wisdom
Each session uses different categories to ensure variety
Duplicate Prevention:

Stores tweet history in tweetHistory.json
Checks similarity with past 90 days of tweets
Makes up to 13 attempts to generate unique content

-Workflow Process:

Generates schedule (tweetSchedule.json)
Saves history (tweetHistory.json)
Posts tweets with delays
Commits changes to GitHub

-Tweet Processing:

Removes hashtags, quotes, and emojis
Ensures 280 character limit
Formats content for readability

-History Management:

90-day rolling window
70% similarity threshold
Automatic cleanup of old tweets

-Error Handling:

Validates environment variables
Verifies Twitter credentials
Handles API failures gracefully

-File Management:

Schedule file for current session
History file for past tweets
Both files tracked in git

-Environment Setup:

Uses .env for local development
Uses GitHub Secrets for production
Manages API keys securely

-Session Coordination:

Morning/Evening session detection
Time-based tweet scheduling
Automatic timezone handling
This creates a fully automated system that generates and posts unique, varied content while maintaining a history to prevent repetition.

## Tech Stack

- Node.js
- OpenAI GPT-4
- Twitter API v2
- GitHub Actions
- Local JSON Storage

## Setup

1. Clone the repository
2. Install dependencies:
