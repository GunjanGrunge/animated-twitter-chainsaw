# Automated Twitter Bot

[![Daily Tweet Generation](https://github.com/GunjanGrunge/animated-twitter-chainsaw/actions/workflows/daily-tweets.yml/badge.svg)](https://github.com/GunjanGrunge/animated-twitter-chainsaw/actions/workflows/daily-tweets.yml)

An automated Twitter bot that generates and posts diverse content using OpenAI GPT-4 and Twitter API, with MongoDB-backed tweet history management to prevent duplicates.

## Features

- **Dual Daily Sessions**: 8:30 AM & 4:30 PM IST
- **4 Tweets Per Session**: Total 8 tweets daily
- **30-Minute Intervals**: Between tweets in each session
- **90-Day History**: Prevents similar tweets within a 90-day window
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
- MongoDB Atlas
- GitHub Actions

## Setup

1. Clone the repository
2. Install dependencies:
