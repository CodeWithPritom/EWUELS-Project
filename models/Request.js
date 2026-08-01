const db       = require('../config/db');
const fallback  = require('../config/fallback');

const Request = {
    async create({ user_id, copy_id, purpose, duration_type, duration_value }) {
        try {
            const [result] = await db.query(
                'INSERT INTO requests (user_id, copy_id, purpose, duration_type, duration_value) VALUES (?, ?, ?, ?, ?)',
                [user_id, copy_id, purpose, duration_type, duration_value]
            );
            return result.insertId;
        } catch {
            return fallback.Request.create({ user_id, copy_id, purpose, duration_type, duration_value });
        }
    },

    async findById(id) {
        try {
            const [rows] = await db.query(`
                SELECT r.*, 
                       u.name as user_name, u.email as user_email,
                       ec.unique_code, ec.status as copy_status,
                       et.name as equipment_name, et.category as equipment_category, et.image_url
                FROM requests r
                JOIN users u ON r.user_id = u.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.id = ?
            `, [id]);
            return rows[0] || null;
        } catch {
            return fallback.Request.findById(id);
        }
    },

    async findByUserId(userId) {
        try {
            const [rows] = await db.query(`
                SELECT r.*, 
                       ec.unique_code, ec.status as copy_status,
                       et.name as equipment_name, et.category as equipment_category, et.image_url
                FROM requests r
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.user_id = ?
                ORDER BY r.requested_at DESC
            `, [userId]);
            return rows;
        } catch {
            return fallback.Request.findByUserId(userId);
        }
    },

    async updateStatus(id, status) {
        try {
            await db.query('UPDATE requests SET status = ? WHERE id = ?', [status, id]);
        } catch {
            fallback.Request.updateStatus(id, status);
        }
    },

    async approve(id) {
        try {
            await db.query(
                'UPDATE requests SET status = ?, approved_at = NOW(), reserved_at = NOW() WHERE id = ?',
                ['Approved', id]
            );
        } catch {
            fallback.Request.approve(id);
        }
    },

    async cancel(id, cancelledBy) {
        try {
            await db.query(
                'UPDATE requests SET status = ?, cancelled_by = ? WHERE id = ?',
                ['Cancelled', cancelledBy, id]
            );
        } catch {
            fallback.Request.cancel(id, cancelledBy);
        }
    },

    async issue(id, dueAt) {
        try {
            await db.query(
                'UPDATE requests SET status = ?, issued_at = NOW(), due_at = ? WHERE id = ?',
                ['Issued', dueAt, id]
            );
        } catch {
            fallback.Request.issue(id, dueAt);
        }
    },

    async returnEquipment(id, returnCondition) {
        try {
            await db.query(
                'UPDATE requests SET status = ?, returned_at = NOW(), return_condition = ? WHERE id = ?',
                ['Returned', returnCondition, id]
            );
        } catch {
            fallback.Request.returnEquipment(id, returnCondition);
        }
    },

    async findPending() {
        try {
            const [rows] = await db.query(`
                SELECT r.*, 
                       u.name as user_name, u.email as user_email, u.role as user_role,
                       ec.unique_code,
                       et.name as equipment_name, et.category as equipment_category, et.image_url
                FROM requests r
                JOIN users u ON r.user_id = u.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.status = 'Pending'
                ORDER BY r.requested_at ASC
            `);
            return rows;
        } catch {
            return fallback.Request.findPending();
        }
    },

    async findByStatus(status) {
        try {
            const [rows] = await db.query(`
                SELECT r.*, 
                       u.name as user_name, u.email as user_email, u.role as user_role,
                       ec.unique_code,
                       et.name as equipment_name, et.category as equipment_category, et.image_url
                FROM requests r
                JOIN users u ON r.user_id = u.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.status = ?
                ORDER BY r.requested_at DESC
            `, [status]);
            return rows;
        } catch {
            return fallback.Request.findByStatus(status);
        }
    },

    async findIssuedOverdue() {
        try {
            const [rows] = await db.query(`
                SELECT r.*, 
                       u.name as user_name, u.email as user_email,
                       ec.unique_code,
                       et.name as equipment_name, et.category as equipment_category
                FROM requests r
                JOIN users u ON r.user_id = u.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.status = 'Issued' AND r.due_at < NOW()
                ORDER BY r.due_at ASC
            `);
            return rows;
        } catch {
            return fallback.Request.findIssuedOverdue();
        }
    },

    async countByStatus(status) {
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM requests WHERE status = ?', [status]);
            return rows[0].count;
        } catch {
            return fallback.Request.countByStatus(status);
        }
    },

    async countActiveByUserId(userId) {
        try {
            const [rows] = await db.query(
                "SELECT COUNT(*) as count FROM requests WHERE user_id = ? AND status IN ('Pending','Approved','Issued')",
                [userId]
            );
            return rows[0].count;
        } catch {
            return fallback.Request.countActiveByUserId(userId);
        }
    }
};

module.exports = Request;
