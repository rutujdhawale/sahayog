// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

const authenticateToken = (req, res, next) => {
  // Check for token in cookie first, then in Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers?.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Access denied. No authentication token provided.'));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(new Error('JWT_SECRET is not configured on the server.'));
  }

  jwt.verify(token, jwtSecret, {}, (err, userData) => {
    if (err) {
      return next(new UnauthorizedError('Invalid or expired authentication token.'));
    }
    // Attach standard user payload to request
    req.user = userData;
    next();
  });
};

module.exports = { authenticateToken };
