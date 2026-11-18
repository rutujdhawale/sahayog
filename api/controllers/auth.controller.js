// controllers/auth.controller.js
const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const {
  verifyGoogleToken,
  getGoogleAuthUrl,
  exchangeGoogleCode,
} = require('../services/googleAuth.service');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');

const bcryptSalt = bcrypt.genSaltSync(10);

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

const signUserToken = (userDoc) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return jwt.sign(
    {
      id: userDoc._id.toString(),
      _id: userDoc._id.toString(),
      email: userDoc.email,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
};

// POST /api/register
const registerUser = async (req, res, next) => {
  const { firstName, lastName, email, password, avatar } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ValidationError('An account with this email already exists.');
    }

    const userDoc = await User.create({
      firstName,
      lastName,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
      avatar: avatar || '',
      authProvider: 'local',
    });

    const token = signUserToken(userDoc);
    const userResponse = typeof userDoc.toPublicJSON === 'function' ? userDoc.toPublicJSON() : {
      id: userDoc._id,
      _id: userDoc._id,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      email: userDoc.email,
      avatar: userDoc.avatar,
    };

    logger.info(`User registered successfully: ${email}`);
    res.cookie('token', token, getCookieOptions()).status(201).json(userResponse);
  } catch (e) {
    next(e);
  }
};

// POST /api/login
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const userDoc = await User.findOne({ email });
    if (!userDoc) {
      throw new NotFoundError('User not found. Please check your email.');
    }

    if (!userDoc.password && userDoc.authProvider === 'google') {
      throw new ValidationError('This account was created with Google Sign-In. Please sign in with Google.');
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) {
      throw new UnauthorizedError('Incorrect password. Please try again.');
    }

    const token = signUserToken(userDoc);
    const userResponse = typeof userDoc.toPublicJSON === 'function' ? userDoc.toPublicJSON() : {
      id: userDoc._id,
      _id: userDoc._id,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      email: userDoc.email,
      avatar: userDoc.avatar,
    };

    logger.info(`User logged in: ${email}`);
    res.cookie('token', token, getCookieOptions()).json(userResponse);
  } catch (e) {
    next(e);
  }
};

// GET /api/auth/google/client-id
const getGoogleClientId = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  const configured = Boolean(
    clientId &&
    clientId !== 'your_google_client_id.apps.googleusercontent.com' &&
    !clientId.includes('your_')
  );
  res.json({ clientId, configured });
};

// GET /api/auth/google/url
const getGoogleUrl = (req, res, next) => {
  try {
    const apiHost = req.protocol + '://' + req.get('host');
    const redirectUri = `${apiHost}/api/auth/google/callback`;
    const url = getGoogleAuthUrl(redirectUri);
    res.json({ url });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/google/callback
const googleCallback = async (req, res, next) => {
  try {
    const { code, error } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error) {
      logger.warn('Google OAuth callback returned error', { error });
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google sign in was cancelled.')}`);
    }

    if (!code) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('No authorization code returned from Google.')}`);
    }

    const apiHost = req.protocol + '://' + req.get('host');
    const redirectUri = `${apiHost}/api/auth/google/callback`;
    const profile = await exchangeGoogleCode(code, redirectUri);

    let userDoc = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });

    if (userDoc) {
      let needsSave = false;
      if (!userDoc.googleId) {
        userDoc.googleId = profile.googleId;
        needsSave = true;
      }
      if (!userDoc.avatar && profile.avatar) {
        userDoc.avatar = profile.avatar;
        needsSave = true;
      }
      if (needsSave) {
        await userDoc.save();
      }
    } else {
      userDoc = await User.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatar: profile.avatar,
        googleId: profile.googleId,
        authProvider: 'google',
      });
      logger.info(`New user created via Google OAuth: ${profile.email}`);
    }

    const token = signUserToken(userDoc);
    res.cookie('token', token, getCookieOptions());
    return res.redirect(`${clientUrl}/?auth=google_success`);
  } catch (err) {
    logger.error('Google OAuth callback failed', { error: err.message });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`);
  }
};

// POST /api/auth/google
const googleAuth = async (req, res, next) => {
  try {
    const idToken = req.googleToken;
    const profile = await verifyGoogleToken(idToken);

    // Find existing user by googleId or email
    let userDoc = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });

    if (userDoc) {
      let needsSave = false;
      if (!userDoc.googleId) {
        userDoc.googleId = profile.googleId;
        needsSave = true;
      }
      if (!userDoc.avatar && profile.avatar) {
        userDoc.avatar = profile.avatar;
        needsSave = true;
      }
      if (needsSave) {
        await userDoc.save();
      }
    } else {
      userDoc = await User.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatar: profile.avatar,
        googleId: profile.googleId,
        authProvider: 'google',
      });
      logger.info(`New user created via Google OAuth: ${profile.email}`);
    }

    const token = signUserToken(userDoc);
    const userResponse = typeof userDoc.toPublicJSON === 'function' ? userDoc.toPublicJSON() : {
      id: userDoc._id,
      _id: userDoc._id,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      email: userDoc.email,
      avatar: userDoc.avatar,
    };

    logger.info(`Google authentication successful for: ${profile.email}`);
    res.cookie('token', token, getCookieOptions()).json(userResponse);
  } catch (e) {
    next(e);
  }
};

// GET /api/profile
const getProfile = async (req, res, next) => {
  const userId = req.user.id || req.user._id;
  try {
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json(null);
    }
    const userResponse = typeof userDoc.toPublicJSON === 'function' ? userDoc.toPublicJSON() : {
      id: userDoc._id,
      _id: userDoc._id,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      email: userDoc.email,
      avatar: userDoc.avatar,
    };
    res.json(userResponse);
  } catch (error) {
    next(error);
  }
};

// POST /api/logout
const logoutUser = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', '', {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    expires: new Date(0),
  }).json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  getGoogleClientId,
  getGoogleUrl,
  googleCallback,
  getProfile,
  logoutUser,
};
