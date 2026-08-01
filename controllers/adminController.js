const bcrypt  = require('bcrypt');
const db       = require('../config/db');
const fallback = require('../config/fallback');
const User = require('../models/User');
const EquipmentType = require('../models/EquipmentType');
const EquipmentCopy = require('../models/EquipmentCopy');
const AuditLog = require('../models/AuditLog');

const adminController = {
    // GET /admin/dashboard
    async dashboard(req, res) {
        try {
            let stats;
            try {
                const [[{ equipmentTypes }]] = await db.query('SELECT COUNT(*) as equipmentTypes FROM equipment_types');
                const [[{ totalCopies }]]    = await db.query('SELECT COUNT(*) as totalCopies FROM equipment_copies');
                const [[{ activeRequests }]] = await db.query("SELECT COUNT(*) as activeRequests FROM requests WHERE status IN ('Pending','Approved','Issued')");
                const [[{ unpaidFines }]]    = await db.query("SELECT COUNT(*) as unpaidFines FROM fines WHERE fine_status = 'Unpaid'");
                const [[{ blockedUsers }]]   = await db.query("SELECT COUNT(*) as blockedUsers FROM users WHERE account_status = 'Blocked'");
                const [[{ totalUsers }]]     = await db.query("SELECT COUNT(*) as totalUsers FROM users WHERE role IN ('Student','Faculty')");
                stats = { equipmentTypes, totalCopies, activeRequests, unpaidFines, blockedUsers, totalUsers };
            } catch {
                const d = fallback;
                const allUsers = [...fallback.User.findAllNonAdmin(), ...fallback.User.findAllStaff()];
                stats = {
                    equipmentTypes: d.EquipmentType.countAll(),
                    totalCopies:    d.EquipmentCopy.countAll(),
                    activeRequests: d.Request.countByStatus('Pending') + d.Request.countByStatus('Approved') + d.Request.countByStatus('Issued'),
                    unpaidFines:    d.Fine.findAllUnpaid().length,
                    blockedUsers:   allUsers.filter(u => u.account_status === 'Blocked').length,
                    totalUsers:     allUsers.filter(u => ['Student','Faculty'].includes(u.role)).length
                };
            }
            res.render('admin/dashboard', {
                title: 'Admin Dashboard — UELS',
                stats
            });
        } catch (err) {
            console.error('Admin dashboard error:', err);
            req.flash('error_msg', 'Failed to load dashboard.');
            res.redirect('/');
        }
    },

    // ==========================================
    // EQUIPMENT TYPES
    // ==========================================

    // GET /admin/equipment-types
    async listTypes(req, res) {
        try {
            const types = await EquipmentType.findAllWithCopyCounts();
            res.render('admin/equipmentTypes', {
                title: 'Equipment Types — UELS',
                types,
                editing: null
            });
        } catch (err) {
            console.error('List types error:', err);
            req.flash('error_msg', 'Failed to load equipment types.');
            res.redirect('/admin/dashboard');
        }
    },

    // GET /admin/equipment-types/:id/edit
    async editTypeForm(req, res) {
        try {
            const types = await EquipmentType.findAllWithCopyCounts();
            const editing = await EquipmentType.findById(req.params.id);
            if (!editing) {
                req.flash('error_msg', 'Equipment type not found.');
                return res.redirect('/admin/equipment-types');
            }
            res.render('admin/equipmentTypes', {
                title: 'Edit Equipment Type — UELS',
                types,
                editing
            });
        } catch (err) {
            console.error('Edit type form error:', err);
            req.flash('error_msg', 'Failed to load equipment type.');
            res.redirect('/admin/equipment-types');
        }
    },

    // POST /admin/equipment-types
    async createType(req, res) {
        try {
            const { name, category, description, image_url } = req.body;
            if (!name || !category) {
                req.flash('error_msg', 'Name and category are required.');
                return res.redirect('/admin/equipment-types');
            }
            const typeId = await EquipmentType.create({ name, category, description, image_url });

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'CREATE_EQUIPMENT_TYPE',
                target_type: 'equipment_type',
                target_id: typeId,
                details: `Created equipment type "${name}" (${category})`
            });

            req.flash('success_msg', `Equipment type "${name}" created successfully.`);
            res.redirect('/admin/equipment-types');
        } catch (err) {
            console.error('Create type error:', err);
            req.flash('error_msg', 'Failed to create equipment type.');
            res.redirect('/admin/equipment-types');
        }
    },

    // PUT /admin/equipment-types/:id
    async updateType(req, res) {
        try {
            const { name, category, description, image_url } = req.body;
            if (!name || !category) {
                req.flash('error_msg', 'Name and category are required.');
                return res.redirect('/admin/equipment-types');
            }
            await EquipmentType.update(req.params.id, { name, category, description, image_url });

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'UPDATE_EQUIPMENT_TYPE',
                target_type: 'equipment_type',
                target_id: req.params.id,
                details: `Updated equipment type "${name}"`
            });

            req.flash('success_msg', `Equipment type "${name}" updated successfully.`);
            res.redirect('/admin/equipment-types');
        } catch (err) {
            console.error('Update type error:', err);
            req.flash('error_msg', 'Failed to update equipment type.');
            res.redirect('/admin/equipment-types');
        }
    },

    // DELETE /admin/equipment-types/:id
    async deleteType(req, res) {
        try {
            const copies = await EquipmentCopy.findByType(req.params.id);
            if (copies.length > 0) {
                req.flash('error_msg', 'Cannot delete: this equipment type still has copies. Remove all copies first.');
                return res.redirect('/admin/equipment-types');
            }
            await EquipmentType.delete(req.params.id);

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'DELETE_EQUIPMENT_TYPE',
                target_type: 'equipment_type',
                target_id: req.params.id,
                details: `Deleted equipment type ID ${req.params.id}`
            });

            req.flash('success_msg', 'Equipment type deleted successfully.');
            res.redirect('/admin/equipment-types');
        } catch (err) {
            console.error('Delete type error:', err);
            req.flash('error_msg', 'Failed to delete equipment type.');
            res.redirect('/admin/equipment-types');
        }
    },

    // ==========================================
    // EQUIPMENT COPIES
    // ==========================================

    // GET /admin/equipment-copies
    async listCopies(req, res) {
        try {
            const typeId = req.query.type;
            const types = await EquipmentType.findAll();
            let copies;
            let selectedType = null;

            if (typeId) {
                copies = await EquipmentCopy.findByType(typeId);
                selectedType = await EquipmentType.findById(typeId);
            } else {
                copies = await EquipmentCopy.findAll();
            }

            res.render('admin/equipmentCopies', {
                title: 'Equipment Copies — UELS',
                copies,
                types,
                selectedType
            });
        } catch (err) {
            console.error('List copies error:', err);
            req.flash('error_msg', 'Failed to load equipment copies.');
            res.redirect('/admin/dashboard');
        }
    },

    // POST /admin/equipment-copies
    async addCopy(req, res) {
        try {
            const { equipment_type_id, unique_code } = req.body;
            if (!equipment_type_id || !unique_code) {
                req.flash('error_msg', 'Equipment type and unique code are required.');
                return res.redirect('/admin/equipment-copies');
            }

            const existing = await EquipmentCopy.findByUniqueCode(unique_code.trim());
            if (existing) {
                req.flash('error_msg', `Code "${unique_code}" already exists. Each copy must have a unique code.`);
                return res.redirect(`/admin/equipment-copies?type=${equipment_type_id}`);
            }

            const copyId = await EquipmentCopy.create({ equipment_type_id, unique_code: unique_code.trim() });

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'ADD_EQUIPMENT_COPY',
                target_type: 'equipment_copy',
                target_id: copyId,
                details: `Added equipment copy "${unique_code.trim()}"`
            });

            req.flash('success_msg', `Copy "${unique_code}" added successfully.`);
            res.redirect(`/admin/equipment-copies?type=${equipment_type_id}`);
        } catch (err) {
            console.error('Add copy error:', err);
            req.flash('error_msg', 'Failed to add equipment copy.');
            res.redirect('/admin/equipment-copies');
        }
    },

    // PUT /admin/equipment-copies/:id/status
    async updateCopyStatus(req, res) {
        try {
            const { status } = req.body;
            const copy = await EquipmentCopy.findById(req.params.id);
            if (!copy) {
                req.flash('error_msg', 'Copy not found.');
                return res.redirect('/admin/equipment-copies');
            }
            await EquipmentCopy.updateStatus(req.params.id, status);

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'UPDATE_COPY_STATUS',
                target_type: 'equipment_copy',
                target_id: req.params.id,
                details: `Changed copy "${copy.unique_code}" status to ${status}`
            });

            req.flash('success_msg', `Copy "${copy.unique_code}" status updated to ${status}.`);
            res.redirect(`/admin/equipment-copies?type=${copy.equipment_type_id}`);
        } catch (err) {
            console.error('Update copy status error:', err);
            req.flash('error_msg', 'Failed to update copy status.');
            res.redirect('/admin/equipment-copies');
        }
    },

    // DELETE /admin/equipment-copies/:id
    async deleteCopy(req, res) {
        try {
            const copy = await EquipmentCopy.findById(req.params.id);
            if (!copy) {
                req.flash('error_msg', 'Copy not found.');
                return res.redirect('/admin/equipment-copies');
            }
            if (!['Available', 'Maintenance'].includes(copy.status)) {
                req.flash('error_msg', `Cannot delete: copy "${copy.unique_code}" is currently ${copy.status}.`);
                return res.redirect(`/admin/equipment-copies?type=${copy.equipment_type_id}`);
            }
            const typeId = copy.equipment_type_id;
            await EquipmentCopy.delete(req.params.id);

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'DELETE_EQUIPMENT_COPY',
                target_type: 'equipment_copy',
                target_id: req.params.id,
                details: `Deleted equipment copy "${copy.unique_code}"`
            });

            req.flash('success_msg', `Copy "${copy.unique_code}" deleted.`);
            res.redirect(`/admin/equipment-copies?type=${typeId}`);
        } catch (err) {
            console.error('Delete copy error:', err);
            req.flash('error_msg', 'Failed to delete copy.');
            res.redirect('/admin/equipment-copies');
        }
    },

    // ==========================================
    // STAFF ACCOUNTS
    // ==========================================

    // GET /admin/staff-accounts
    async listStaff(req, res) {
        try {
            let staff;
            try {
                const [rows] = await db.query("SELECT id, name, email, role, account_status, created_at FROM users WHERE role = 'Staff' ORDER BY created_at DESC");
                staff = rows;
            } catch {
                staff = fallback.User.findAllStaff();
            }
            res.render('admin/staffAccounts', {
                title: 'Staff Accounts — UELS',
                staff
            });
        } catch (err) {
            console.error('List staff error:', err);
            req.flash('error_msg', 'Failed to load staff accounts.');
            res.redirect('/admin/dashboard');
        }
    },

    // POST /admin/staff-accounts
    async createStaffAccount(req, res) {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                req.flash('error_msg', 'All fields are required.');
                return res.redirect('/admin/staff-accounts');
            }

            if (password.length < 6) {
                req.flash('error_msg', 'Password must be at least 6 characters.');
                return res.redirect('/admin/staff-accounts');
            }

            const existing = await User.findByEmail(email);
            if (existing) {
                req.flash('error_msg', 'An account with that email already exists.');
                return res.redirect('/admin/staff-accounts');
            }

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const staffId = await User.create({ name, email, password_hash, role: 'Staff' });

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'CREATE_STAFF_ACCOUNT',
                target_type: 'user',
                target_id: staffId,
                details: `Created staff account for "${name}" (${email})`
            });

            req.flash('success_msg', `Staff account for "${name}" created successfully.`);
            res.redirect('/admin/staff-accounts');
        } catch (err) {
            console.error('Create staff error:', err);
            req.flash('error_msg', 'Failed to create staff account.');
            res.redirect('/admin/staff-accounts');
        }
    },

    // ==========================================
    // FINE SETTINGS (TASK 29)
    // ==========================================

    // GET /admin/fine-settings
    async getFineSettings(req, res) {
        try {
            let rateDay = '50';
            let rateMinute = '1';
            try {
                const [rows] = await db.query('SELECT `key`, value FROM settings');
                rows.forEach(r => {
                    if (r.key === 'late_fine_rate_per_day') rateDay = r.value;
                    if (r.key === 'late_fine_rate_per_minute') rateMinute = r.value;
                });
            } catch {
                rateDay    = fallback.Settings.get('late_fine_rate_per_day')    || '50';
                rateMinute = fallback.Settings.get('late_fine_rate_per_minute') || '1';
            }
            res.render('admin/fineSettings', {
                title: 'Fine Rate Settings — UELS',
                rateDay,
                rateMinute
            });
        } catch (err) {
            console.error('Get fine settings error:', err);
            req.flash('error_msg', 'Failed to load fine settings.');
            res.redirect('/admin/dashboard');
        }
    },

    // POST /admin/fine-settings
    async updateFineSettings(req, res) {
        try {
            const { late_fine_rate_per_day, late_fine_rate_per_minute } = req.body;

            const dayRate = parseFloat(late_fine_rate_per_day);
            const minRate = parseFloat(late_fine_rate_per_minute);

            if (isNaN(dayRate) || dayRate < 0 || isNaN(minRate) || minRate < 0) {
                req.flash('error_msg', 'Please enter valid non-negative numbers for fine rates.');
                return res.redirect('/admin/fine-settings');
            }

            try {
                await db.query(
                    "INSERT INTO settings (`key`, value) VALUES ('late_fine_rate_per_day', ?) ON DUPLICATE KEY UPDATE value = ?",
                    [dayRate.toString(), dayRate.toString()]
                );
                await db.query(
                    "INSERT INTO settings (`key`, value) VALUES ('late_fine_rate_per_minute', ?) ON DUPLICATE KEY UPDATE value = ?",
                    [minRate.toString(), minRate.toString()]
                );
            } catch {
                fallback.Settings.set('late_fine_rate_per_day',    dayRate.toString());
                fallback.Settings.set('late_fine_rate_per_minute', minRate.toString());
            }

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'UPDATE_FINE_SETTINGS',
                details: `Updated fine rates: ৳${dayRate}/day, ৳${minRate}/minute`
            });

            req.flash('success_msg', 'Fine rate settings updated successfully.');
            res.redirect('/admin/fine-settings');
        } catch (err) {
            console.error('Update fine settings error:', err);
            req.flash('error_msg', 'Failed to update fine settings.');
            res.redirect('/admin/fine-settings');
        }
    },

    // ==========================================
    // AUDIT LOG (TASK 30)
    // ==========================================

    // GET /admin/audit-log
    async viewAuditLog(req, res) {
        try {
            const logs = await AuditLog.findAll();
            res.render('admin/auditLog', {
                title: 'Audit Log — UELS',
                logs
            });
        } catch (err) {
            console.error('Audit log error:', err);
            req.flash('error_msg', 'Failed to load audit logs.');
            res.redirect('/admin/dashboard');
        }
    },

    // ==========================================
    // MAINTENANCE MANAGEMENT (TASK 31)
    // ==========================================

    // GET /admin/maintenance
    async listMaintenance(req, res) {
        try {
            let items;
            try {
                const [rows] = await db.query(`
                    SELECT ec.*, et.name as equipment_name, et.category,
                           (SELECT r.return_condition FROM requests r WHERE r.copy_id = ec.id ORDER BY r.returned_at DESC LIMIT 1) as last_condition
                    FROM equipment_copies ec
                    JOIN equipment_types et ON ec.equipment_type_id = et.id
                    WHERE ec.status = 'Maintenance'
                    ORDER BY ec.created_at DESC
                `);
                items = rows;
            } catch {
                items = fallback.EquipmentCopy.findByStatus('Maintenance').map(c => ({ ...c, equipment_name: c.type_name, last_condition: 'Damaged' }));
            }
            res.render('admin/maintenance', {
                title: 'Maintenance Management — UELS',
                items
            });
        } catch (err) {
            console.error('List maintenance error:', err);
            req.flash('error_msg', 'Failed to load maintenance items.');
            res.redirect('/admin/dashboard');
        }
    },

    // POST /admin/maintenance/:id/repair
    async markRepaired(req, res) {
        try {
            const copyId = req.params.id;
            const copy = await EquipmentCopy.findById(copyId);

            if (!copy) {
                req.flash('error_msg', 'Equipment copy not found.');
                return res.redirect('/admin/maintenance');
            }

            await EquipmentCopy.updateStatus(copyId, 'Available');

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'REPAIR_EQUIPMENT',
                target_type: 'equipment_copy',
                target_id: copyId,
                details: `Marked equipment ${copy.type_name} (${copy.unique_code}) as Repaired/Available`
            });

            req.flash('success_msg', `Equipment ${copy.unique_code} repaired and restored to Available status.`);
            res.redirect('/admin/maintenance');
        } catch (err) {
            console.error('Mark repaired error:', err);
            req.flash('error_msg', 'Failed to mark equipment as repaired.');
            res.redirect('/admin/maintenance');
        }
    }
};

module.exports = adminController;
