const express = require("express");
const path = require("path");
const pool = require("../db/index");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin.html"));
});

router.get("/api/admin/users", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  try {
    const { rows } = await pool.query(
      "SELECT id, email, display_name, approved, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
