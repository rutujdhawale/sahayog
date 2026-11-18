// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {
  registerUser,
  loginUser,
  googleAuth,
  getGoogleClientId,
  getProfile,
  logoutUser,
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
} = require('../middlewares/validation.middleware');

// Public authentication routes
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

// Passport Google OAuth 2.0 flow
router.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not set in .env',
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      const msg = err?.message || 'Google authentication failed or was cancelled';
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(msg)}`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Login session error')}`);
      }

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.redirect(`${clientUrl}/`);
    });
  })(req, res, next);
});

// Direct token endpoint (for GIS / mobile clients)
router.post('/auth/google', validateGoogleAuth, googleAuth);
router.get('/auth/google/client-id', getGoogleClientId);

router.post('/logout', logoutUser);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
