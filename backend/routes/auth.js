const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const router = express.Router();

const db = new Database('amc.db');
const SECRET = process.env.JWT_SECRET || 'amc-np-secret-2026';

function createToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        SECRET,
        { expiresIn: '7d' }
    );
}

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// REGISTER
router.post('/register', (req, res) => {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const result = db.prepare(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)'
    ).run(name, email, phone, password, role || 'customer');

    const user = { id: result.lastInsertRowid, name, email, phone, role: role || 'customer' };
    const token = createToken(user);
    res.json({ user, token });
});

// LOGIN
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.disabled) {
        return res.status(403).json({ error: 'Your account has been disabled. Contact admin.' });
    }

    const token = createToken(user);
    res.json({
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, disabled: user.disabled },
        token
    });
});

// GOOGLE LOGIN
router.post('/google', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !email.includes('@gmail.com')) {
        return res.status(400).json({ error: 'Invalid Gmail' });
    }

    let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);

    if (!user) {
        const displayName = name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
        const result = db.prepare(
            'INSERT INTO users (name, email, password, role, auth_provider) VALUES (?,?,?,?,?)'
        ).run(displayName, email, password || 'google', 'customer', 'google');
        user = { id: result.lastInsertRowid, name: displayName, email, role: 'customer' };
    }

    const token = createToken(user);
    res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token
    });
});

// ME (current user)
router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(req.user.id);
    res.json({ user });
});

// UPDATE profile
router.put('/me', authMiddleware, (req, res) => {
    const { name, phone, address, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (password) {
        if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
        db.prepare('UPDATE users SET name=?, phone=?, password=? WHERE id=?').run(
            name || user.name, phone || user.phone, password, req.user.id
        );
    } else {
        db.prepare('UPDATE users SET name=?, phone=? WHERE id=?').run(
            name || user.name, phone || user.phone, req.user.id
        );
    }
    const updated = db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(req.user.id);
    res.json({ user: updated });
});

// DELETE account
router.delete('/me', authMiddleware, (req, res) => {
    const uid = req.user.id;
    db.prepare('DELETE FROM bills WHERE user_id=?').run(uid);
    db.prepare('DELETE FROM services WHERE user_id=?').run(uid);
    db.prepare('DELETE FROM devices WHERE user_id=?').run(uid);
    db.prepare('DELETE FROM users WHERE id=?').run(uid);
    res.json({ message: 'Account deleted' });
});

// ADMIN: Get token for a user (impersonation)
router.post('/impersonate', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = createToken(user);
    res.json({ user, token });
});

// ADMIN: Enable/Disable user
router.put('/users/:id/status', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { disabled } = req.body;
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot disable yourself' });
    const result = db.prepare('UPDATE users SET disabled=? WHERE id=?').run(disabled ? 1 : 0, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: disabled ? 'User disabled' : 'User enabled' });
});

// ADMIN: Update user role
router.put('/users/:id/role', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { role } = req.body;
    if (!['customer', 'technician', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
    const result = db.prepare('UPDATE users SET role=? WHERE id=?').run(role, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    const updated = db.prepare('SELECT id,name,email,phone,role,disabled FROM users WHERE id=?').get(userId);
    res.json({ user: updated });
});

// ADMIN: Create new user
router.post('/users', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const userRole = ['customer', 'technician', 'admin'].includes(role) ? role : 'customer';
    const result = db.prepare(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)'
    ).run(name, email, phone || '', password, userRole);

    const user = db.prepare('SELECT id,name,email,phone,role,disabled,created_at FROM users WHERE id=?').get(result.lastInsertRowid);
    res.json({ user });
});

// ADMIN: Delete user
router.delete('/users/:id', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(403).json({ error: 'Cannot delete yourself' });
    const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.prepare('DELETE FROM bills WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM services WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM devices WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM users WHERE id=?').run(userId);
    res.json({ message: 'User deleted' });
});

module.exports = router;
