const Database = require('better-sqlite3');
const db = new Database('amc.db');
db.prepare(`CREATE TABLE IF NOT EXISTS renewals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    plan_type TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    amount REAL NOT NULL,
    previous_end_date TEXT,
    new_end_date TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();
console.log('renewals table created');
const cols = db.prepare('PRAGMA table_info(renewals)').all();
cols.forEach(c => console.log('  ' + c.name + ' ' + c.type));
db.close();
