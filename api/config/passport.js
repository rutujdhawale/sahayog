const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (clientID && clientSecret && !clientID.includes('your_')) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const googleId = profile.id;
          const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
          const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
          const avatar = profile.photos?.[0]?.value || '';

          if (!email) {
            return done(new Error('No email found in Google account'), null);
          }

          let user = await User.findOne({
            $or: [{ googleId }, { email }],
          });

          if (user) {
            let needsSave = false;
            if (!user.googleId) {
              user.googleId = googleId;
              needsSave = true;
            }
            if (!user.avatar && avatar) {
              user.avatar = avatar;
              needsSave = true;
            }
            if (needsSave) await user.save();
            return done(null, user);
          }

          user = await User.create({
            firstName,
            lastName,
            email,
            avatar,
            googleId,
            authProvider: 'google',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
