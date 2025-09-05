require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const knex = require('knex')(require('./knexfile'));
const path = require('path');
const fs = require('fs');

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

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// --- AUTH (demo) ---
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  const user = await knex('users').where({ email }).first();
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  const token = jwt.sign({ sub: user.id, role: user.role, org_id: user.org_id }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad auth' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
}

// --- K9 endpoints ---
app.get('/k9s', authMiddleware, async (req, res) => {
  const k9s = await knex('k9s').select('*');
  res.json(k9s);
});

app.get('/k9s/:id', authMiddleware, async (req, res) => {
  const k9 = await knex('k9s').where({ id: req.params.id }).first();
  res.json(k9);
});

app.post('/k9s/:id/vaccinations', authMiddleware, upload.single('file'), async (req, res) => {
  const k9Id = req.params.id;
  const { type, date } = req.body;
  const file = req.file ? req.file.filename : null;
  await knex('vaccinations').insert({ k9_id: k9Id, type, date, file });
  res.json({ ok: true, message: 'vaccination recorded' });
});

// --- Training sessions ---
app.post('/training-sessions', authMiddleware, upload.array('media', 6), async (req, res) => {
  const { k9_id, discipline, area, duration_minutes, notes, date } = req.body;
  const id = await knex('training_sessions').insert({ k9_id, discipline, area, duration_minutes, notes, date }).returning('id');
  res.json({ ok: true, id });
});

// --- Clock-in ---
app.post('/time/clock-in', authMiddleware, upload.single('selfie'), async (req, res) => {
  const { lat, lon, siteId, insideGeofence, jobCode } = req.body;
  const file = req.file ? req.file.filename : null;
  await knex('time_logs').insert({ user_id: req.user.sub, lat, lon, site_id: siteId, inside_geofence: insideGeofence === 'true', job_code: jobCode, selfie: file, clock_in: new Date() });
  res.json({ ok: true, message: 'clock-in recorded' });
});

// --- simple site nearest (POST lat lon) ---
app.post('/sites/nearest', authMiddleware, async (req, res) => {
  const { lat, lon } = req.body;
  const sites = await knex('sites').select('*');
  let best = null; let bestD = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.lat - lat, s.lon - lon);
    if (d < bestD) { best = s; bestD = d; }
  }
  res.json({ site: best, distance: bestD });
});

// --- utility ---
app.get('/me', authMiddleware, async (req, res) => {
  const user = await knex('users').where({ id: req.user.sub }).first().select('id','email','name','role');
  res.json(user);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
