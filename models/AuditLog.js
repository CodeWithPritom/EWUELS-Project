const db       = require('../config/db');
const fallback  = require('../config/fallback');

const AuditLog = {
    async create({ actor_id, action, target_type = null, target_id = null, details = null }) {
        try {
            const [result] = await db.query(
                'INSERT INTO audit_logs (actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
                [actor_id, action, target_type, target_id, details]
            );
            return result.insertId;
        } catch {
            return fallback.AuditLog.create({ actor_id, action, target_type, target_id, details });
        }
    },

    async findAll() {
        try {
            const [rows] = await db.query(`
                SELECT al.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
                FROM audit_logs al
                JOIN users u ON al.actor_id = u.id
                ORDER BY al.created_at DESC
            `);
            return rows;
        } catch {
            return fallback.AuditLog.findAll();
        }
    }
};

module.exports = AuditLog;
