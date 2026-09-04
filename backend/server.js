require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
            return callback(null, true);
        }
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());

const db = new Database('amc.db');

// Add column if missing (for older DBs)
try { db.exec("ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0"); } catch(e) {}

// Init DB
const initSQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password TEXT,
  role TEXT DEFAULT 'customer',
  auth_provider TEXT DEFAULT 'local',
  disabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  brand TEXT,
  model TEXT,
  serial TEXT,
  address TEXT,
  mobile TEXT,
  purchase_date TEXT,
  warranty INTEGER DEFAULT 12,
  next_service DATETIME
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  device_id INTEGER,
  device_name TEXT,
  type TEXT,
  date TEXT,
  time_slot TEXT,
  issue TEXT,
  status TEXT DEFAULT 'pending',
  cost REAL DEFAULT 0,
  technician TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  service_id INTEGER,
  bill_no TEXT,
  device_name TEXT,
  service_type TEXT,
  amount REAL,
  date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  paid_date TEXT,
  payment_method TEXT
);
`;
db.exec(initSQL);
console.log('SQLite DB initialized.');

// Health check
app.get('/', (req, res) => res.json({ message: 'AMC NP Backend Running', version: '1.0' }));

// Demo seed if empty
const seed = () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    if (count.c === 0) {
        const users = [
            {name:'Demo Customer',email:'demo@amc.com',phone:'9841234567',password:'demo123',role:'customer'},
            {name:'Ramesh Tech',email:'tech@amc.com',phone:'9851234567',password:'tech123',role:'technician'},
            {name:'Admin User',email:'admin@amc.com',phone:'9861234567',password:'admin123',role:'admin'},
        ];
        users.forEach(u => {
            db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)')
                .run(u.name, u.email, u.phone, u.password, u.role);
        });
        console.log('Demo users seeded.');
    }
};
seed();

// Routes
const auth = require('./routes/auth');
const devices = require('./routes/devices');
const services = require('./routes/services');
const bills = require('./routes/bills');

app.use('/api/auth', auth);
app.use('/api/devices', devices);
app.use('/api/services', services);
app.use('/api/bills', bills);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
