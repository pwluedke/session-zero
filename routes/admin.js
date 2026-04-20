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
      `SELECT id, email, display_name, approved, role, ai_enabled, ai_daily_limit, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Registered before /:id routes so "ai-bulk" is not parsed as an id.
router.post("/api/admin/users/ai-bulk", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const { ai_enabled } = req.body;
  if (typeof ai_enabled !== "boolean") {
    return res.status(400).json({ error: "ai_enabled must be a boolean" });
  }
  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET ai_enabled = $1 WHERE role != 'admin'",
      [ai_enabled]
    );
    res.json({ ok: true, updated: rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const userId = parseInt(req.params.id);
  try {
    await pool.query("UPDATE users SET approved = TRUE WHERE id = $1", [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function killSession(userId) {
  if (!pool) return;
  await pool.query(
    "DELETE FROM session WHERE (sess->'passport'->>'user')::integer = $1",
    [userId]
  );
}

router.post("/api/admin/users/:id/deny", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const userId = parseInt(req.params.id);
  try {
    await killSession(userId);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/admin/users/:id/revoke", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const userId = parseInt(req.params.id);
  try {
    await pool.query("UPDATE users SET approved = FALSE WHERE id = $1", [userId]);
    await killSession(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not available" });
  const userId = parseInt(req.params.id);
  const { ai_enabled, ai_daily_limit } = req.body;
  try {
    await pool.query(
      "UPDATE users SET ai_enabled = $1, ai_daily_limit = $2 WHERE id = $3",
      [ai_enabled, ai_daily_limit ?? null, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
