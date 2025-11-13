const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'sessions.json');
const PORT = process.env.PORT || 3000;

// ensure data dir
fs.mkdirSync(path.join(__dirname,'data'), { recursive: true });
if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.json());

// Simple basic-auth middleware for professor routes
function basicAuth(req, res, next){
  const auth = req.headers.authorization;
  if(!auth){ res.setHeader('WWW-Authenticate','Basic realm="ECOPLAY"'); return res.status(401).send('Auth required'); }
  const parts = Buffer.from(auth.split(' ')[1],'base64').toString().split(':');
  const user = parts[0], pass = parts[1];
  if(user === 'caio' && pass === 'caio12345') return next();
  res.setHeader('WWW-Authenticate','Basic realm="ECOPLAY"'); return res.status(403).send('Forbidden');
}

// Save a session (from student)
app.post('/api/session', (req, res) => {
  const entry = req.body;
  if(!entry || !entry.name || !entry.class) return res.status(400).send('Invalid');
  const arr = JSON.parse(fs.readFileSync(DATA_FILE));
  arr.push(Object.assign({id: Date.now()}, entry));
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
  res.json({ok:true});
});

// Get all sessions (professor only)
app.get('/api/sessions', basicAuth, (req, res) => {
  const arr = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(arr);
});

// Clear data (professor only)
app.delete('/api/sessions', basicAuth, (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  res.json({ok:true});
});

app.listen(PORT, ()=> console.log('ECOPLAY server listening on port', PORT));
