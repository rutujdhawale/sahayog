// config/db.js
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      const msg = "MONGO_URI (or MONGODB_URI) environment variable is not defined";
      logger.error(msg);
      if (process.env.NODE_ENV !== "test") {
        throw new Error(msg);
      }
      return null;
    }
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    logger.error("MongoDB connection error:", { error: err.message });
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw err;
  }
};

module.exports = connectDB;
