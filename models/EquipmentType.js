const db       = require('../config/db');
const fallback  = require('../config/fallback');

const EquipmentType = {
    async findAll() {
        try {
            const [rows] = await db.query('SELECT * FROM equipment_types ORDER BY created_at DESC');
            return rows;
        } catch {
            return fallback.EquipmentType.findAll();
        }
    },

    async findById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM equipment_types WHERE id = ?', [id]);
            return rows[0] || null;
        } catch {
            return fallback.EquipmentType.findById(id);
        }
    },

    async create({ name, category, description, image_url }) {
        try {
            const [result] = await db.query(
                'INSERT INTO equipment_types (name, category, description, image_url) VALUES (?, ?, ?, ?)',
                [name, category, description || null, image_url || null]
            );
            return result.insertId;
        } catch {
            return fallback.EquipmentType.create({ name, category, description, image_url });
        }
    },

    async update(id, { name, category, description, image_url }) {
        try {
            await db.query(
                'UPDATE equipment_types SET name = ?, category = ?, description = ?, image_url = ? WHERE id = ?',
                [name, category, description || null, image_url || null, id]
            );
        } catch {
            fallback.EquipmentType.update(id, { name, category, description, image_url });
        }
    },

    async delete(id) {
        try {
            await db.query('DELETE FROM equipment_types WHERE id = ?', [id]);
        } catch {
            fallback.EquipmentType.delete(id);
        }
    },

    async countAll() {
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM equipment_types');
            return rows[0].count;
        } catch {
            return fallback.EquipmentType.countAll();
        }
    },

    async findAllWithCopyCounts() {
        try {
            const [rows] = await db.query(`
                SELECT et.*, 
                       COUNT(ec.id) as total_copies,
                       SUM(CASE WHEN ec.status = 'Available' THEN 1 ELSE 0 END) as available_copies
                FROM equipment_types et
                LEFT JOIN equipment_copies ec ON et.id = ec.equipment_type_id
                GROUP BY et.id
                ORDER BY et.created_at DESC
            `);
            return rows;
        } catch {
            return fallback.EquipmentType.findAllWithCopyCounts();
        }
    }
};

module.exports = EquipmentType;
