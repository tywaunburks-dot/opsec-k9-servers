const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ---- DEMO DATA (no database) ----
const users = [
  { id: 1, name: 'Owner Admin', email: 'admin@opsec.local', role: 'admin' },
  { id: 2, name: 'Trainer One', email: 'trainer@opsec.local', role: 'trainer' },
  { id: 3, name: 'Handler One', email: 'handler@opsec.local', role: 'handler' },
];
// password for all = "password123"
const K9S = [{ id: 1, name: 'Rex', breed: 'German Shepherd', dob: '2019-05-01', sex: 'M', call_sign: 'Rex', status: 'Active' }];
const TRAINING = [];
const TIMELOGS = [];

// very simple “auth”: checks email + password === "password123"
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const u = users.find(x => x.email === email);
  if (!u || password !== 'password123') return res.status(401).json({ error: 'invalid credentials' });
  // demo token (NOT JWT) for now
  const token = Buffer.from(`${u.id}:${u.role}`).toString('base64');
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

function demoAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2) {
    try {
      const [id, role] = Buffer.from(parts[1], 'base64').toString('utf8').split(':');
      req.user = { id: Number(id), role };
      return next();
    } catch (e) {}
  }
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/k9s', demoAuth, (req, res) => res.json(K9S));

app.post('/k9s/:id/vaccinations', demoAuth, upload.single('file'), (req, res) => {
  res.json({ ok: true, file: req.file?.filename || null });
});

app.post('/training-sessions', demoAuth, (req, res) => {
  const { k9_id, discipline, area, duration_minutes, notes, date } = req.body || {};
  const id = TRAINING.length + 1;
  TRAINING.push({ id, k9_id, discipline, area, duration_minutes, notes, date });
  res.json({ ok: true, id });
});

app.post('/time/clock-in', demoAuth, upload.single('selfie'), (req, res) => {
  const { lat, lon, siteId, insideGeofence, jobCode } = req.body || {};
  const id = TIMELOGS.length + 1;
  TIMELOGS.push({ id, user_id: req.user.id, lat, lon, site_id: siteId, inside_geofence: insideGeofence === 'true', job_code: jobCode, selfie: req.file?.filename || null, clock_in: new Date().toISOString() });
  res.json({ ok: true, message: 'clock-in recorded (demo)' });
});

app.post('/sites/nearest', demoAuth, (req, res) => {
  const { lat, lon } = req.body || {};
  res.json({ site: { id: 'site-1', name: 'OPSEC Training Yard', lat: 40.0, lon: -86.0, radius_meters: 500 }, distance: Math.hypot((lat-40.0)||0, (lon+86.0)||0) });
});

app.get('/', (_req, res) => res.send('OPSEC K9 demo server is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('OPSEC K9 demo server listening on http://localhost:' + PORT));
