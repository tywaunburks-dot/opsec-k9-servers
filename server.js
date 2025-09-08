const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Health routes
app.get('/', (_req, res) => res.send('OPSEC K9 demo server is running'));
app.get('/ping', (_req, res) => res.json({ ok: true, msg: 'pong' }));

// --- uploads (selfies/docs) ---
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- demo data ---
const users = [
  { id: 1, name: 'Owner Admin',  email: 'admin@opsec.local',   role: 'admin'   },
  { id: 2, name: 'Trainer One',  email: 'trainer@opsec.local', role: 'trainer' },
  { id: 3, name: 'Handler One',  email: 'handler@opsec.local', role: 'handler' }
]; // password for all: password123

const K9S = [{ id: 1, name: 'Rex', breed: 'German Shepherd', status: 'Active' }];
const TRAINING = [];
const TIMELOGS = [];
const VACCINATIONS = []; // {k9_id, type, date, expires}

// --- auth (demo token = base64 "id:role") ---
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = users.find(x => x.email === email);
  if (!u || password !== 'password123') return res.status(401).json({ error: 'invalid credentials' });
  const token = Buffer.from(`${u.id}:${u.role}`).toString('base64');
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

function demoAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    try {
      const [id, role] = Buffer.from(h.slice(7), 'base64').toString('utf8').split(':');
      req.user = { id: Number(id), role };
      return next();
    } catch (e) {}
  }
  return res.status(401).json({ error: 'unauthorized' });
}

// --- core routes ---
app.get('/k9s', demoAuth, (_req, res) => res.json(K9S));

app.post('/training-sessions', demoAuth, (req, res) => {
  const id = TRAINING.length + 1;
  TRAINING.push({ id, ...req.body, user_id: req.user.id, created_at: new Date().toISOString() });
  res.json({ ok: true, id });
});

app.post('/time/clock-in', demoAuth, upload.single('selfie'), (req, res) => {
  const id = TIMELOGS.length + 1;
  TIMELOGS.push({
    id,
    user_id: req.user.id,
    lat: req.body.lat,
    lon: req.body.lon,
    site_id: req.body.siteId,
    inside_geofence: String(req.body.insideGeofence) === 'true',
    job_code: req.body.jobCode || 'Training',
    selfie: req.file?.filename || null,
    clock_in: new Date().toISOString()
  });
  res.json({ ok: true, message: 'clock-in recorded (demo)' });
});

// --- vaccinations demo ---
app.post('/k9s/:id/vaccinations', demoAuth, (req, res) => {
  const { type, date, expires } = req.body || {};
  if (!type || !expires) return res.status(400).json({ error: 'type and expires required' });
  VACCINATIONS.push({ k9_id: Number(req.params.id), type, date: date || new Date().toISOString(), expires });
  res.json({ ok: true });
});
app.get('/vaccinations/upcoming', demoAuth, (_req, res) => {
  const soon = VACCINATIONS.filter(v => new Date(v.expires) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  res.json(soon);
});

// --- start server (Render: bind to 0.0.0.0 and use PORT) ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => console.log('OPSEC K9 demo server listening on port ' + PORT));
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
