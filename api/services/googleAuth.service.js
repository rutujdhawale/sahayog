// services/googleAuth.service.js
const logger = require('../utils/logger');
const { UnauthorizedError, BadRequestError } = require('../utils/errors');

/**
 * Generates the official Google OAuth 2.0 Authorization URL for web redirect flow.
 */
function getGoogleAuthUrl(redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new BadRequestError('GOOGLE_CLIENT_ID is not configured in server environment.');
  }
  const scope = encodeURIComponent('openid profile email');
  const encodedRedirect = encodeURIComponent(redirectUri);
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirect}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
}

/**
 * Exchanges Google authorization code for access and ID tokens, then returns verified profile.
 */
async function exchangeGoogleCode(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BadRequestError('Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) are missing in server environment.');
  }

  let tokenRes;
  try {
    tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch (err) {
    logger.error('Failed to contact Google token endpoint', { error: err.message });
    throw new UnauthorizedError('Unable to connect to Google OAuth service.');
  }

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    logger.error('Google token exchange failed', { status: tokenRes.status, body: errorBody });
    throw new UnauthorizedError('Failed to exchange authorization code with Google. The code may be expired or already used.');
  }

  const tokenData = await tokenRes.json();
  if (tokenData.id_token) {
    return await verifyGoogleToken(tokenData.id_token);
  }

  // Fallback to userinfo endpoint with access_token
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userInfoRes.ok) {
    throw new UnauthorizedError('Failed to retrieve user profile from Google.');
  }
  const userProfile = await userInfoRes.json();
  return extractGoogleProfile(userProfile, clientId);
}

/**
 * Verifies a Google ID token using Google's official OAuth2 tokeninfo service or google-auth-library.
 * @param {string} idToken - The Google ID token string received from Google Sign-In
 * @returns {Promise<{googleId: string, email: string, firstName: string, lastName: string, avatar: string}>}
 */
async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new BadRequestError('Google ID token is required.');
  }

  const configuredClientId = process.env.GOOGLE_CLIENT_ID;

  // Try google-auth-library if installed, otherwise use Google's tokeninfo API
  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(configuredClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: configuredClientId || undefined,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedError('Invalid Google token payload.');
    }

    return extractGoogleProfile(payload, configuredClientId);
  } catch (libraryError) {
    if (libraryError.code === 'MODULE_NOT_FOUND' || libraryError.message?.includes('Cannot find module')) {
      return await verifyWithTokenInfo(idToken, configuredClientId);
    }
    logger.warn('google-auth-library verification failed, falling back to tokeninfo endpoint', {
      error: libraryError.message,
    });
    return await verifyWithTokenInfo(idToken, configuredClientId);
  }
}

async function verifyWithTokenInfo(idToken, expectedClientId) {
  const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;

  let response;
  try {
    response = await fetch(tokenInfoUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  } catch (networkError) {
    logger.error('Failed to connect to Google OAuth service', { error: networkError.message });
    throw new UnauthorizedError('Unable to verify Google credentials. Please try again.');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    logger.warn('Google tokeninfo rejected token', { status: response.status, body: errorBody });
    throw new UnauthorizedError('Google authentication failed. The token is invalid or expired.');
  }

  const payload = await response.json();
  return extractGoogleProfile(payload, expectedClientId);
}

function extractGoogleProfile(payload, expectedClientId) {
  // Check token expiration
  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    throw new UnauthorizedError('Google authentication token has expired. Please sign in again.');
  }

  // Validate audience if client ID is configured
  if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
    logger.warn('Google token audience mismatch', { tokenAud: payload.aud, expectedAud: expectedClientId });
    throw new UnauthorizedError('Google authentication client ID mismatch.');
  }

  const email = payload.email?.toLowerCase();
  if (!email) {
    throw new UnauthorizedError('Google account does not have an associated email address.');
  }

  const firstName = payload.given_name || payload.name?.split(' ')[0] || 'User';
  const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
  const avatar = payload.picture || '';
  const googleId = payload.sub;

  return {
    googleId,
    email,
    firstName,
    lastName: lastName || ' ',
    avatar,
  };
}

module.exports = {
  verifyGoogleToken,
  getGoogleAuthUrl,
  exchangeGoogleCode,
};
