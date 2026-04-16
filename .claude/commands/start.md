# /start
Start the local development server for Session Zero.

Before starting, verify:
- .env file exists in the project root
- .env contains: ANTHROPIC_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET, DATABASE_URL, BGG_API_TOKEN
- If any required key is missing, warn before proceeding
- Check to see if port 3000 is in use:  before running tests locally, always check if port 3000 is in use:
bash lsof -i :3000
- If anything shows up, kill it first:
bashkill -9 $(lsof -t -i:3000)

Then run:
node server.js

After starting, confirm:
- Server is running at http://localhost:3000
- Database connection message appears in logs
- BGG_API_TOKEN status is shown in logs

Note: If you are about to run Playwright tests, stop this server first.
Playwright manages its own server with NODE_ENV=test via the webServer config.
Running both simultaneously will cause test failures.