require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("./config/passport");
const pool = require("./db/index");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.json());

const migrate = require("./db/migrate");
migrate();

const sessionStore = pool
  ? new (require("connect-pg-simple")(session))({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(require("./middleware/requireAuth"));

app.use(require("./routes/auth"));
app.use(require("./routes/admin"));
app.use(require("./routes/api"));
app.use(require("./routes/static"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Game Night Planner running at http://localhost:${PORT}`);
  console.log(`BGG_API_TOKEN: ${process.env.BGG_API_TOKEN ? "loaded" : "not set"}`);
});
