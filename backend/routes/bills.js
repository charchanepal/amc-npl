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

// GET bills
router.get('/', auth, (req, res) => {
    let rows;
    if (req.user.role === 'admin') {
        rows = db.prepare(`
            SELECT b.*, u.name as customer_name, u.email as customer_email
            FROM bills b
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.date DESC
        `).all();
    } else {
        rows = db.prepare(`
            SELECT b.*, u.name as customer_name
            FROM bills b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.user_id=? ORDER BY b.date DESC
        `).all(req.user.id);
    }
    res.json({ bills: rows });
});

// PAY bill
router.put('/:id/pay', auth, (req, res) => {
    const { method } = req.body;
    db.prepare(
        `UPDATE bills SET status='paid', paid_date=?, payment_method=? WHERE id=? AND user_id=?`
    ).run(new Date().toISOString(), method, req.params.id, req.user.id);
    res.json({ message: 'Payment successful' });
});

module.exports = router;
