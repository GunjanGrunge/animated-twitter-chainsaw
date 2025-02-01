# Automated Twitter Bot

[![Daily Tweet Generation](https://github.com/GunjanGrunge/animated-twitter-chainsaw/actions/workflows/daily-tweets.yml/badge.svg)](https://github.com/GunjanGrunge/animated-twitter-chainsaw/actions/workflows/daily-tweets.yml)

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

## Tech Stack

- Node.js
- OpenAI GPT-4
- Twitter API v2
- GitHub Actions
- Local JSON Storage

## Setup

1. Clone the repository
2. Install dependencies:
