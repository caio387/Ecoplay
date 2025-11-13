
ECOPLAY 3.0 Online - Prototype
=============================

This package contains a simple Node.js + Express server and a public web app (modern, bilingual PT/EN)
that demonstrates ECOPLAY 3.0 features:
- Mixed games (saving, investing, planning)
- Badges (4 types) with confetti popup and sound
- Students login by name (anyone who types a name enters)
- Professor login (Basic Auth): username 'caio' and password 'caio12345'
- Server endpoints: POST /api/session (save), GET /api/sessions (protected), DELETE /api/sessions (protected)

How to run locally:
1. Install Node.js (14+ recommended).
2. In the project root, run: npm install
3. Start server: npm start
4. Open http://localhost:3000 in your browser.

Notes:
- This is a prototype. Data is stored in a JSON file at /data/sessions.json on the server.
- For production hosting, deploy to platforms like Render/Heroku by setting NODE_ENV and providing storage.
