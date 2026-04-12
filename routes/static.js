const express = require("express");
const path = require("path");

const router = express.Router();
const root = path.join(__dirname, "..");

router.use(express.static(root));

// Catch-all 404 for requests that don't match any static file
router.use((req, res) => {
  res.status(404).send("Not found");
});

module.exports = router;
