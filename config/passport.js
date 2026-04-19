const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Resend } = require("resend");
const pool = require("../db/index");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  if (!pool) return done(null, false);
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0] || false);
  } catch (err) {
    done(err);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = `${process.env.APP_URL || "http://localhost:3000"}/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        if (!pool) {
          console.error("[Auth] Cannot authenticate - database not configured");
          return done(null, false);
        }
        try {
          const existing = await pool.query(
            "SELECT * FROM users WHERE google_id = $1",
            [profile.id]
          );
          if (existing.rows.length > 0) return done(null, existing.rows[0]);

          const inserted = await pool.query(
            `INSERT INTO users (google_id, email, display_name, avatar_url, approved)
             VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
            [
              profile.id,
              profile.emails[0].value,
              profile.displayName,
              profile.photos[0]?.value ?? null,
            ]
          );
          const newUser = inserted.rows[0];

          if (
            process.env.NODE_ENV !== "test" &&
            process.env.RESEND_API_KEY &&
            process.env.ADMIN_EMAIL
          ) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            resend.emails
              .send({
                from: "Session Zero <noreply@somanygames.app>",
                to: process.env.ADMIN_EMAIL,
                subject: "New user pending approval",
                text: `New user signed up:\nName: ${newUser.display_name}\nEmail: ${newUser.email}\n\nApprove them in the admin panel at https://somanygames.app/admin`,
              })
              .catch((err) =>
                console.error("[Auth] Failed to send new user notification:", err.message)
              );
          }

          done(null, newUser);
        } catch (err) {
          console.error("[Auth] Database error during authentication:", err.message);
          done(null, false);
        }
      }
    )
  );
} else {
  console.warn("[Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set - OAuth disabled");
}

module.exports = passport;
