const winston = require("winston");
const path = require("path");
// Get the absolute path to the log directory
const logDirectory = path.join(__dirname, "../logs");

// Creates an info and error logger
const info_logger = winston.createLogger({
  level: "info", // Set the log level (e.g., 'info', 'debug', 'error')
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, message }) => `${timestamp} - ${message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDirectory, `info/${getCurrentDate()}.log`),
      level: "info",
    }),
  ],
});
const error_logger = winston.createLogger({
  level: "info", // Set the log level (e.g., 'info', 'debug', 'error')
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, message }) => `${timestamp} - ${message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDirectory, `error/${getCurrentDate()}.log`),
      level: "error",
    }),
  ],
});

// Log an info-level message
function info(message) {
  info_logger.info(message);
}

// Log an error-level message
function error(message) {
  error_logger.error(message);
}

// Utility function to get the current date in the format 'YYYY-MM-DD'
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  info,
  error,
};
