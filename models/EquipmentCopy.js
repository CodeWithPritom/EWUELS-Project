const db       = require('../config/db');
const fallback  = require('../config/fallback');

const EquipmentCopy = {
    async findAll() {
        try {
            const [rows] = await db.query(`
                SELECT ec.*, et.name as type_name, et.category
                FROM equipment_copies ec
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                ORDER BY ec.created_at DESC
            `);
            return rows;
        } catch {
            return fallback.EquipmentCopy.findAll();
        }
    },

    async findByType(equipmentTypeId) {
        try {
            const [rows] = await db.query(`
                SELECT ec.*, et.name as type_name, et.category
                FROM equipment_copies ec
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE ec.equipment_type_id = ?
                ORDER BY ec.unique_code ASC
            `, [equipmentTypeId]);
            return rows;
        } catch {
            return fallback.EquipmentCopy.findByType(equipmentTypeId);
        }
    },

    async findById(id) {
        try {
            const [rows] = await db.query(`
                SELECT ec.*, et.name as type_name, et.category
                FROM equipment_copies ec
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE ec.id = ?
            `, [id]);
            return rows[0] || null;
        } catch {
            return fallback.EquipmentCopy.findById(id);
        }
    },

    async findByUniqueCode(uniqueCode) {
        try {
            const [rows] = await db.query('SELECT * FROM equipment_copies WHERE unique_code = ?', [uniqueCode]);
            return rows[0] || null;
        } catch {
            return fallback.EquipmentCopy.findByUniqueCode(uniqueCode);
        }
    },

    async create({ equipment_type_id, unique_code }) {
        try {
            const [result] = await db.query(
                'INSERT INTO equipment_copies (equipment_type_id, unique_code) VALUES (?, ?)',
                [equipment_type_id, unique_code]
            );
            return result.insertId;
        } catch {
            return fallback.EquipmentCopy.create({ equipment_type_id, unique_code });
        }
    },

    async updateStatus(id, status) {
        try {
            await db.query('UPDATE equipment_copies SET status = ? WHERE id = ?', [status, id]);
        } catch {
            fallback.EquipmentCopy.updateStatus(id, status);
        }
    },

    async findAvailableByType(equipmentTypeId) {
        try {
            const [rows] = await db.query(
                "SELECT * FROM equipment_copies WHERE equipment_type_id = ? AND status = 'Available' ORDER BY unique_code ASC",
                [equipmentTypeId]
            );
            return rows;
        } catch {
            return fallback.EquipmentCopy.findAvailableByType(equipmentTypeId);
        }
    },

    async countAll() {
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM equipment_copies');
            return rows[0].count;
        } catch {
            return fallback.EquipmentCopy.countAll();
        }
    },

    async delete(id) {
        try {
            await db.query('DELETE FROM equipment_copies WHERE id = ?', [id]);
        } catch {
            fallback.EquipmentCopy.delete(id);
        }
    },

    async findByStatus(status) {
        try {
            const [rows] = await db.query(`
                SELECT ec.*, et.name as type_name, et.category
                FROM equipment_copies ec
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE ec.status = ?
                ORDER BY ec.unique_code ASC
            `, [status]);
            return rows;
        } catch {
            return fallback.EquipmentCopy.findByStatus(status);
        }
    }
};

module.exports = EquipmentCopy;
