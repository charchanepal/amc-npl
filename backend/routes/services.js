const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const router = express.Router();

const db = new Database('amc.db');
const SECRET = process.env.JWT_SECRET || 'amc-np-secret-2026';

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
}

// GET services
router.get('/', auth, (req, res) => {
    let rows;
    if (req.user.role === 'admin') {
        rows = db.prepare(`
            SELECT s.*, u.name as customer_name, u.email as customer_email
            FROM services s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        `).all();
    } else if (req.user.role === 'technician') {
        rows = db.prepare(`
            SELECT s.*, u.name as customer_name, u.email as customer_email
            FROM services s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE (s.technician=? OR (s.technician IS NULL AND s.status='pending'))
            ORDER BY s.created_at DESC
        `).all(req.user.name);
    } else {
        rows = db.prepare(`
            SELECT s.*, u.name as customer_name, u.email as customer_email
            FROM services s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.user_id=? ORDER BY s.created_at DESC
        `).all(req.user.id);
    }
    res.json({ services: rows });
});

// BOOK service
router.post('/', auth, (req, res) => {
    const { device_id, device_name, type, date, time_slot, issue } = req.body;
    const result = db.prepare(
        `INSERT INTO services (user_id, device_id, device_name, type, date, time_slot, issue, status)
         VALUES (?,?,?,?,?,?,?, 'pending')`
    ).run(req.user.id, device_id, device_name, type, date, time_slot, issue);
    res.json({ id: result.lastInsertRowid, message: 'Service booked' });
});

// ASSIGN technician (admin only)
router.put('/:id/assign', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { technician } = req.body;
    db.prepare('UPDATE services SET technician=? WHERE id=?').run(technician, req.params.id);
    res.json({ message: 'Assigned' });
});

// ACCEPT job (technician)
router.put('/:id/accept', auth, (req, res) => {
    if (req.user.role !== 'technician') return res.status(403).json({ error: 'Tech only' });
    db.prepare('UPDATE services SET technician=? WHERE id=? AND technician IS NULL').run(req.user.name, req.params.id);
    res.json({ message: 'Accepted' });
});

// MARK COMPLETE
router.put('/:id/complete', auth, (req, res) => {
    if (req.user.role !== 'technician' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { cost, notes } = req.body;
    const result = db.prepare(
        `UPDATE services SET status='completed', cost=?, notes=? WHERE id=?`
    ).run(cost || 0, notes || '', req.params.id);

    if (result.changes > 0) {
        const service = db.prepare('SELECT * FROM services WHERE id=?').get(req.params.id);
        const billNo = 'INV-' + Date.now();
        const dueDate = new Date(Date.now() + 15 * 86400000).toISOString();
        db.prepare(
            `INSERT INTO bills (user_id, service_id, bill_no, device_name, service_type, amount, date, due_date, status)
             VALUES (?,?,?,?,?,?,?,?, 'pending')`
        ).run(service.user_id, service.id, billNo, service.device_name, service.type, cost, new Date().toISOString(), dueDate);
    }
    res.json({ message: 'Completed and bill generated' });
});

// USERS list (admin only)
router.get('/users/all', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const users = db.prepare('SELECT id,name,email,phone,role,disabled,created_at FROM users').all();
    res.json({ users });
});

module.exports = router;
