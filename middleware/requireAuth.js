// Routes that are always accessible without authentication.
const PUBLIC_PATHS = ["/login", "/auth/google", "/auth/google/callback", "/auth/logout"];

function requireAuth(req, res, next) {
  // In test mode, bypass auth entirely so the Playwright suite can run without
  // OAuth credentials, a session secret, or a live database. NODE_ENV=test is
  // set explicitly by playwright.config.js webServer.env and by the CI workflow
  // -- it is not a general development bypass.
  if (process.env.NODE_ENV === "test") return next();

  if (PUBLIC_PATHS.includes(req.path)) return next();

  if (req.isAuthenticated()) return next();

  // API requests get a machine-readable 401 rather than an HTML redirect.
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  res.redirect("/login");
}

module.exports = requireAuth;
