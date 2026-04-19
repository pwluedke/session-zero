const express = require("express");
const path = require("path");
const passport = require("../config/passport");
const pool = require("../db/index");

const router = express.Router();

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

router.get("/pending", (req, res) => {
  res.sendFile(path.join(__dirname, "../pending.html"));
});

router.get("/demo", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

router.get("/auth/google", (req, res, next) => {
  if (!pool) {
    return res.status(503).json({ error: "Database not configured - set DATABASE_URL to enable authentication" });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: "OAuth not configured" });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user.approved) return res.redirect("/pending");
    res.redirect("/");
  }
);

router.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

module.exports = router;
