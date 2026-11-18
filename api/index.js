// index.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

// Load .env from possible locations (workspace root or local api directory)
const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require("dotenv").config({ path: p });
    break;
  }
}

const connectDB = require("./config/db");
const passport = require("./config/passport");
const logger = require("./utils/logger");
const requestLogger = require("./middlewares/requestLogger");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const contributionRoutes = require("./routes/contribution.routes");

const app = express();

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.SKIP_DB_CONNECT === "1" ||
  process.argv.includes("--test");

// Connect to Database unless in testing environment
if (!isTestEnv) {
  connectDB();
}

// Core Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Express Session for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "sahayog_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === allowedOrigin || origin === "http://localhost:5173" || origin === "http://localhost:3000") {
        return callback(null, true);
      }
      return callback(null, true);
    },
  }),
);

// Structured Request Logger
app.use(requestLogger);

// Static uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health & Test Routes
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", message: "Sahayog API is operational", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", authRoutes);
app.use("/api", eventRoutes);
app.use("/api", contributionRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    logger.info(`Sahayog API Server is running on port ${port} 🚀`, {
      port,
      environment: process.env.NODE_ENV || "development",
    });
  });
}

module.exports = app;
