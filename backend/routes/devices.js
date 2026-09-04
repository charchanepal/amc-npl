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

// GET all devices
router.get('/', auth, (req, res) => {
    let rows;
    if (req.user.role === 'admin') {
        rows = db.prepare(`
            SELECT d.*, u.name as owner_name, u.email as owner_email
            FROM devices d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.id DESC
        `).all();
    } else {
        rows = db.prepare('SELECT * FROM devices WHERE user_id=? ORDER BY id DESC').all(req.user.id);
    }
    res.json({ devices: rows });
});

// ADD device
router.post('/', auth, (req, res) => {
    const { type, brand, model, serial, address, mobile, purchase_date, warranty } = req.body;
    const purchase = new Date(purchase_date);
    const next = new Date(purchase);
    next.setMonth(next.getMonth() + (warranty || 12));

    const result = db.prepare(
        `INSERT INTO devices (user_id, type, brand, model, serial, address, mobile, purchase_date, warranty, next_service)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(req.user.id, type, brand, model, serial, address || '', mobile || '', purchase_date, warranty || 12, next.toISOString());

    res.json({ id: result.lastInsertRowid, message: 'Device added' });
});

// UPDATE device
router.put('/:id', auth, (req, res) => {
    const { type, brand, model, serial, address, mobile, purchase_date, warranty } = req.body;
    const purchase = new Date(purchase_date);
    const next = new Date(purchase);
    next.setMonth(next.getMonth() + (warranty || 12));

    const result = db.prepare(
        `UPDATE devices
         SET type=?, brand=?, model=?, serial=?, address=?, mobile=?, purchase_date=?, warranty=?, next_service=?
         WHERE id=? AND user_id=?`
    ).run(type, brand, model, serial, address || '', mobile || '', purchase_date, warranty || 12, next.toISOString(), req.params.id, req.user.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Device not found or not yours' });
    }
    res.json({ message: 'Updated' });
});

// DELETE device
router.delete('/:id', auth, (req, res) => {
    db.prepare('DELETE FROM renewals WHERE device_id=?').run(req.params.id);
    db.prepare('DELETE FROM devices WHERE user_id=? AND id=?').run(req.user.id, req.params.id);
    res.json({ message: 'Deleted' });
});

// RENEW device service
router.post('/:id/renew', auth, (req, res) => {
    const { plan_type, duration_months, amount, notes } = req.body;
    if (!plan_type || !duration_months) return res.status(400).json({ error: 'Plan type and duration required' });

    const device = db.prepare('SELECT * FROM devices WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const now = new Date();
    const currentEnd = device.next_service ? new Date(device.next_service) : new Date(device.purchase_date);
    const baseDate = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + parseInt(duration_months));

    const newWarranty = (device.warranty || 12) + parseInt(duration_months);

    const result = db.prepare(`
        INSERT INTO renewals (device_id, user_id, plan_type, duration_months, amount, previous_end_date, new_end_date, payment_status, notes)
        VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
        device.id, req.user.id, plan_type, duration_months, amount || 0,
        device.next_service || null, newEnd.toISOString(),
        'pending', notes || ''
    );

    db.prepare('UPDATE devices SET warranty=?, next_service=? WHERE id=?').run(newWarranty, newEnd.toISOString(), device.id);

    const billNo = 'REN-' + Date.now();
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString();
    if (amount && amount > 0) {
        db.prepare(`
            INSERT INTO bills (user_id, service_id, bill_no, device_name, service_type, amount, date, due_date, status)
            VALUES (?,?,?,?,?,?,?,?, 'pending')
        `).run(req.user.id, result.lastInsertRowid, billNo, device.brand + ' ' + device.model, 'Renewal - ' + plan_type, amount, new Date().toISOString(), dueDate);
    }

    res.json({
        message: 'Service renewed successfully',
        renewal: { id: result.lastInsertRowid, new_end_date: newEnd.toISOString() },
        new_warranty: newWarranty
    });
});

// GET renewals for a device
router.get('/:id/renewals', auth, (req, res) => {
    const device = db.prepare('SELECT id FROM devices WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!device && req.user.role !== 'admin') return res.status(404).json({ error: 'Device not found' });
    const renewals = db.prepare('SELECT * FROM renewals WHERE device_id=? ORDER BY created_at DESC').all(req.params.id);
    res.json({ renewals });
});

module.exports = router;
