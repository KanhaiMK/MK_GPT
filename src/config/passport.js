const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const userModel = require("../models/user.model");

// ─── GOOGLE STRATEGY ────────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Check if user already exists with this googleId
        let user = await userModel.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        }

        // 2. Check if user exists with same email (signed up normally before)
        user = await userModel.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link googleId to existing account
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
        }

        // 3. Create a brand new user
        user = await userModel.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
        });

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// ─── GITHUB STRATEGY ────────────────────────────────────────
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userModel.findOne({ githubId: profile.id });

        if (user) {
            return done(null, user);
        }

        // GitHub email can be private/null — fallback to a generated one
        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

        user = await userModel.findOne({ email });

        if (user) {
            user.githubId = profile.id;
            await user.save();
            return done(null, user);
        }

        user = await userModel.create({
            name: profile.displayName || profile.username,
            email,
            githubId: profile.id,
        });

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

module.exports = passport;