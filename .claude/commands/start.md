# /start local
Start the local development server for Session Zero.

Before starting, verify:
- .env file exists in the project root
- DATABASE_URL is set in .env
- If either is missing, warn before proceeding

Then run:
```bash
kill -9 $(lsof -t -i:3000) 2>/dev/null
node server.js
```

After starting, confirm:
- Server is running at http://localhost:3000
- Database connection message appears in logs
- BGG_API_TOKEN status is shown in logs

Note: If you are about to run Playwright tests, stop this server first.
Playwright manages its own server with NODE_ENV=test via the webServer config.
Running both simultaneously will cause test failures.
