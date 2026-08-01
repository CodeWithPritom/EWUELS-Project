const db       = require('../config/db');
const fallback  = require('../config/fallback');

const User = {
    async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0] || null;
        } catch {
            return fallback.User.findByEmail(email);
        }
    },

    async findById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
            return rows[0] || null;
        } catch {
            return fallback.User.findById(id);
        }
    },

    async create({ name, email, password_hash, role }) {
        try {
            const [result] = await db.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [name, email, password_hash, role]
            );
            return result.insertId;
        } catch {
            return fallback.User.create({ name, email, password_hash, role });
        }
    },

    async updateStatus(id, account_status, block_type = null, block_reason = null, blocked_by = null) {
        try {
            await db.query(
                'UPDATE users SET account_status = ?, block_type = ?, block_reason = ?, blocked_by = ? WHERE id = ?',
                [account_status, block_type, block_reason, blocked_by, id]
            );
        } catch {
            fallback.User.updateStatus(id, account_status, block_type, block_reason, blocked_by);
        }
    },

    async findAllStaff() {
        try {
            const [rows] = await db.query("SELECT * FROM users WHERE role = 'Staff' ORDER BY created_at DESC");
            return rows;
        } catch {
            return fallback.User.findAllStaff();
        }
    },

    async findAllNonAdmin() {
        try {
            const [rows] = await db.query("SELECT * FROM users WHERE role != 'Admin' ORDER BY name ASC");
            return rows;
        } catch {
            return fallback.User.findAllNonAdmin();
        }
    }
};

module.exports = User;
