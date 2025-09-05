const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// simple request log
app.use((req,res,next)=>{ console.log(new Date().toISOString(), req.method, req.url); next(); });

// health + ping
app.get('/', (_req,res)=> res.send('OPSEC K9 demo server is running'));
app.get('/ping', (_req,res)=> res.json({ ok:true, msg:'pong' }));

// uploads (selfies, docs) -> ./uploads
const UPLOADS = path.join(__dirname,'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// demo users and data
const users = [
  { id:1, name:'Owner Admin', email:'admin@opsec.local', role:'admin' },
  { id:2, name:'Trainer One', email:'trainer@opsec.local', role:'trainer' },
  { id:3, name:'Handler One', email:'handler@opsec.local', role:'handler' },
]; // password for all: password123

const K9S = [{ id:1, name:'Rex', breed:'German Shepherd', status:'Active' }];
const TRAINING = [];
const TIMELOGS = [];

app.post('/auth/login', (req,res)=>{
  const { email, password } = req.body || {};
  const u = users.find(x=>x.email===email);
  if (!u || password!=='password123') return res.status(401).json({ error:'invalid credentials' });
  const token = Buffer.from(`${u.id}:${u.role}`).toString('base64'); // demo token
  res.json({ token, user:{ id:u.id, name:u.name, email:u.email, role:u.role } });
});

function demoAuth(req,res,next){
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')){
    try{
      const [id, role] = Buffer.from(h.slice(7),'base64').toString('utf8').split(':');
      req.user = { id:Number(id), role };
      return next();
    }catch(e){}
  }
  return res.status(401).json({ error:'unauthorized' });
}

app.get('/k9s', demoAuth, (_req,res)=> res.json(K9S));

app.post('/training-sessions', demoAuth, (req,res)=>{
  const id = TRAINING.length+1;
  TRAINING.push({ id, ...req.body });
  res.json({ ok:true, id });
});

app.post('/time/clock-in', demoAuth, upload.single('selfie'), (req,res)=>{
  const id = TIMELOGS.length+1;
  TIMELOGS.push({ id, user_id:req.user.id, ...req.body, selfie:req.file?.filename || null, clock_in:new Date().toISOString() });
  res.json({ ok:true, message:'clock-in recorded (demo)' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('OPSEC K9 demo server listening on http://localhost:'+PORT));
