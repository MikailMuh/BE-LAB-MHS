const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
require('dotenv').config();

async function findOrCreateUser(provider, profile){
    const oauthId = profile.id;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const username = profile.displayName || `${provider}_user_${oauthId}`;
    
    const [rows] = await db.query(
        'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
        [provider, oauthId]
    );

    if(rows.length > 0){
        return rows[0];
    }

    const [result] = await db.query(
        'INSERT INTO users (username, email, role, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?)',
        [username, email, 'user', provider, oauthId]
    );
    return { id: result.insertId, username, email, role: 'user', oauth_provider: provider, oauth_id: oauthId };
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],   // ← tambahin ini
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser('google', profile);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;