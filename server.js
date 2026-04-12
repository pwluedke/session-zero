require("dotenv").config();
const express = require("express");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.json());

app.use(require("./routes/auth"));
app.use(require("./routes/api"));
app.use(require("./routes/static"));

const migrate = require("./db/migrate");
migrate();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Game Night Planner running at http://localhost:${PORT}`);
  console.log(`BGG_API_TOKEN: ${process.env.BGG_API_TOKEN ? "loaded" : "not set"}`);
});
