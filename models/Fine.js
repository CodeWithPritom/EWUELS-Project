const db       = require('../config/db');
const fallback  = require('../config/fallback');

const Fine = {
    async create({ request_id, user_id, fine_type, amount }) {
        try {
            const [result] = await db.query(
                'INSERT INTO fines (request_id, user_id, fine_type, amount) VALUES (?, ?, ?, ?)',
                [request_id, user_id, fine_type, amount]
            );
            return result.insertId;
        } catch {
            return fallback.Fine.create({ request_id, user_id, fine_type, amount });
        }
    },

    async findByUserId(userId) {
        try {
            const [rows] = await db.query(`
                SELECT f.*, 
                       et.name as equipment_name, ec.unique_code,
                       staff.name as paid_by_staff_name
                FROM fines f
                JOIN requests r ON f.request_id = r.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                LEFT JOIN users staff ON f.paid_confirmed_by = staff.id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            `, [userId]);
            return rows;
        } catch {
            return fallback.Fine.findByUserId(userId);
        }
    },

    async findByRequestId(requestId) {
        try {
            const [rows] = await db.query('SELECT * FROM fines WHERE request_id = ?', [requestId]);
            return rows;
        } catch {
            return fallback.Fine.findByRequestId(requestId);
        }
    },

    async countUnpaidByUser(userId) {
        try {
            const [rows] = await db.query(
                "SELECT COUNT(*) as count FROM fines WHERE user_id = ? AND fine_status = 'Unpaid'",
                [userId]
            );
            return rows[0].count;
        } catch {
            return fallback.Fine.countUnpaidByUser(userId);
        }
    },

    async markPaid(id, paidConfirmedBy) {
        try {
            await db.query(
                "UPDATE fines SET fine_status = 'Paid', paid_at = NOW(), paid_confirmed_by = ? WHERE id = ?",
                [paidConfirmedBy, id]
            );
        } catch {
            fallback.Fine.markPaid(id, paidConfirmedBy);
        }
    },

    async findAllUnpaid() {
        try {
            const [rows] = await db.query(`
                SELECT f.*, 
                       u.name as user_name, u.email as user_email, u.account_status, u.block_type,
                       et.name as equipment_name, ec.unique_code
                FROM fines f
                JOIN users u ON f.user_id = u.id
                JOIN requests r ON f.request_id = r.id
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE f.fine_status = 'Unpaid'
                ORDER BY f.created_at DESC
            `);
            return rows;
        } catch {
            return fallback.Fine.findAllUnpaid();
        }
    }
};

module.exports = Fine;
