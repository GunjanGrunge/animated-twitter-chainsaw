const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/tweet-bot.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  async log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    const logString = JSON.stringify(logEntry);
    console.log(logString);

    try {
      await fs.appendFile(this.logFile, logString + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  info(message, data) { this.log('INFO', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  debug(message, data) { this.log('DEBUG', message, data); }
}

module.exports = new Logger(); 