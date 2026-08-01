/**
 * fallback.js - JSON Fallback Data Store
 *
 * Loads seed_data.json once on startup.
 * Provides helper methods that mirror common DB query patterns.
 * Used by models when MySQL is unavailable (DEMO / OFFLINE mode).
 *
 * NOTE: All write methods (create/update/delete) are in-memory only —
 *       data resets on server restart. This is intentional for demo mode.
 */

const path = require('path');
const fs   = require('fs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'seed_data.json');

let data = null;

function load() {
    if (data) return data;
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(raw);
        // Deep-clone so mutations stay in memory and don't corrupt the parse
        data = JSON.parse(JSON.stringify(data));
        console.log('[UELS] 📄 Fallback JSON data loaded from seed_data.json');
    } catch (err) {
        console.error('[UELS] ❌ Could not load seed_data.json:', err.message);
        data = { users: [], equipment_types: [], equipment_copies: [], requests: [], fines: [], settings: [], audit_logs: [] };
    }
    return data;
}

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function nextId(arr) {
    return arr.length ? Math.max(...arr.map(r => r.id)) + 1 : 1;
}

// ─────────────────────────────────────────────
// USER helpers
// ─────────────────────────────────────────────

const User = {
    findByEmail(email) {
        const d = load();
        return d.users.find(u => u.email === email) || null;
    },
    findById(id) {
        const d = load();
        return d.users.find(u => u.id === Number(id)) || null;
    },
    create({ name, email, password_hash, role }) {
        const d = load();
        const newUser = {
            id: nextId(d.users),
            name, email, password_hash, role,
            account_status: 'Active',
            block_type: null, block_reason: null, blocked_by: null,
            created_at: new Date().toISOString()
        };
        d.users.push(newUser);
        return newUser.id;
    },
    updateStatus(id, account_status, block_type = null, block_reason = null, blocked_by = null) {
        const d = load();
        const u = d.users.find(u => u.id === Number(id));
        if (u) { u.account_status = account_status; u.block_type = block_type; u.block_reason = block_reason; u.blocked_by = blocked_by; }
    },
    findAllStaff() {
        const d = load();
        return d.users.filter(u => u.role === 'Staff');
    },
    findAllNonAdmin() {
        const d = load();
        return d.users.filter(u => u.role !== 'Admin');
    }
};

// ─────────────────────────────────────────────
// EQUIPMENT TYPE helpers
// ─────────────────────────────────────────────

const EquipmentType = {
    findAll() {
        const d = load();
        return [...d.equipment_types].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    findById(id) {
        const d = load();
        return d.equipment_types.find(t => t.id === Number(id)) || null;
    },
    create({ name, category, description, image_url }) {
        const d = load();
        const newType = { id: nextId(d.equipment_types), name, category, description: description || null, image_url: image_url || null, created_at: new Date().toISOString(), total_copies: 0, available_copies: 0 };
        d.equipment_types.push(newType);
        return newType.id;
    },
    update(id, { name, category, description, image_url }) {
        const d = load();
        const t = d.equipment_types.find(t => t.id === Number(id));
        if (t) { t.name = name; t.category = category; t.description = description || null; t.image_url = image_url || null; }
    },
    delete(id) {
        const d = load();
        d.equipment_types = d.equipment_types.filter(t => t.id !== Number(id));
    },
    countAll() {
        return load().equipment_types.length;
    },
    findAllWithCopyCounts() {
        const d = load();
        return d.equipment_types.map(et => {
            const copies = d.equipment_copies.filter(c => c.equipment_type_id === et.id);
            return {
                ...et,
                total_copies: copies.length,
                available_copies: copies.filter(c => c.status === 'Available').length
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
};

// ─────────────────────────────────────────────
// EQUIPMENT COPY helpers
// ─────────────────────────────────────────────

const EquipmentCopy = {
    _enrich(copy) {
        const d = load();
        const et = d.equipment_types.find(t => t.id === copy.equipment_type_id);
        return { ...copy, type_name: et ? et.name : 'Unknown', category: et ? et.category : '' };
    },
    findAll() {
        const d = load();
        return d.equipment_copies.map(c => this._enrich(c));
    },
    findByType(equipmentTypeId) {
        const d = load();
        return d.equipment_copies.filter(c => c.equipment_type_id === Number(equipmentTypeId)).map(c => this._enrich(c));
    },
    findById(id) {
        const d = load();
        const copy = d.equipment_copies.find(c => c.id === Number(id));
        return copy ? this._enrich(copy) : null;
    },
    findByUniqueCode(uniqueCode) {
        const d = load();
        return d.equipment_copies.find(c => c.unique_code === uniqueCode) || null;
    },
    create({ equipment_type_id, unique_code }) {
        const d = load();
        const newCopy = { id: nextId(d.equipment_copies), equipment_type_id: Number(equipment_type_id), unique_code, status: 'Available' };
        d.equipment_copies.push(newCopy);
        return newCopy.id;
    },
    updateStatus(id, status) {
        const d = load();
        const c = d.equipment_copies.find(c => c.id === Number(id));
        if (c) c.status = status;
    },
    findAvailableByType(equipmentTypeId) {
        const d = load();
        return d.equipment_copies.filter(c => c.equipment_type_id === Number(equipmentTypeId) && c.status === 'Available');
    },
    countAll() {
        return load().equipment_copies.length;
    },
    delete(id) {
        const d = load();
        d.equipment_copies = d.equipment_copies.filter(c => c.id !== Number(id));
    },
    findByStatus(status) {
        const d = load();
        return d.equipment_copies.filter(c => c.status === status).map(c => this._enrich(c));
    }
};

// ─────────────────────────────────────────────
// REQUEST helpers
// ─────────────────────────────────────────────

const Request = {
    _enrich(req) {
        const d = load();
        const user  = d.users.find(u => u.id === req.user_id) || {};
        const copy  = d.equipment_copies.find(c => c.id === req.copy_id) || {};
        const et    = d.equipment_types.find(t => t.id === copy.equipment_type_id) || {};
        return {
            ...req,
            user_name: user.name || 'Unknown',
            user_email: user.email || '',
            user_role: user.role || '',
            unique_code: copy.unique_code || '',
            copy_status: copy.status || '',
            equipment_name: et.name || 'Unknown',
            equipment_category: et.category || ''
        };
    },
    create({ user_id, copy_id, purpose, duration_type, duration_value }) {
        const d = load();
        const newReq = {
            id: nextId(d.requests),
            user_id: Number(user_id), copy_id: Number(copy_id),
            purpose, duration_type, duration_value: Number(duration_value),
            status: 'Pending',
            requested_at: new Date().toISOString(),
            approved_at: null, reserved_at: null, issued_at: null,
            due_at: null, returned_at: null, return_condition: null, cancelled_by: null
        };
        d.requests.push(newReq);
        return newReq.id;
    },
    findById(id) {
        const d = load();
        const req = d.requests.find(r => r.id === Number(id));
        return req ? this._enrich(req) : null;
    },
    findByUserId(userId) {
        const d = load();
        return d.requests.filter(r => r.user_id === Number(userId))
            .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
            .map(r => this._enrich(r));
    },
    updateStatus(id, status) {
        const d = load();
        const r = d.requests.find(r => r.id === Number(id));
        if (r) r.status = status;
    },
    approve(id) {
        const d = load();
        const r = d.requests.find(r => r.id === Number(id));
        if (r) { r.status = 'Approved'; r.approved_at = new Date().toISOString(); r.reserved_at = new Date().toISOString(); }
    },
    cancel(id, cancelledBy) {
        const d = load();
        const r = d.requests.find(r => r.id === Number(id));
        if (r) { r.status = 'Cancelled'; r.cancelled_by = cancelledBy; }
    },
    issue(id, dueAt) {
        const d = load();
        const r = d.requests.find(r => r.id === Number(id));
        if (r) { r.status = 'Issued'; r.issued_at = new Date().toISOString(); r.due_at = dueAt; }
    },
    returnEquipment(id, returnCondition) {
        const d = load();
        const r = d.requests.find(r => r.id === Number(id));
        if (r) { r.status = 'Returned'; r.returned_at = new Date().toISOString(); r.return_condition = returnCondition; }
    },
    findPending() {
        const d = load();
        return d.requests.filter(r => r.status === 'Pending')
            .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at))
            .map(r => this._enrich(r));
    },
    findByStatus(status) {
        const d = load();
        return d.requests.filter(r => r.status === status)
            .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
            .map(r => this._enrich(r));
    },
    findIssuedOverdue() {
        const now = new Date();
        const d = load();
        return d.requests.filter(r => r.status === 'Issued' && r.due_at && new Date(r.due_at) < now)
            .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
            .map(r => this._enrich(r));
    },
    countByStatus(status) {
        return load().requests.filter(r => r.status === status).length;
    },
    countActiveByUserId(userId) {
        return load().requests.filter(r => r.user_id === Number(userId) && ['Pending','Approved','Issued'].includes(r.status)).length;
    }
};

// ─────────────────────────────────────────────
// FINE helpers
// ─────────────────────────────────────────────

const Fine = {
    _enrich(fine) {
        const d = load();
        const req  = d.requests.find(r => r.id === fine.request_id) || {};
        const copy = d.equipment_copies.find(c => c.id === req.copy_id) || {};
        const et   = d.equipment_types.find(t => t.id === copy.equipment_type_id) || {};
        const user = d.users.find(u => u.id === fine.user_id) || {};
        const staff = fine.paid_confirmed_by ? (d.users.find(u => u.id === fine.paid_confirmed_by) || {}) : {};
        return {
            ...fine,
            equipment_name: et.name || 'Unknown',
            unique_code: copy.unique_code || '',
            user_name: user.name || '',
            user_email: user.email || '',
            account_status: user.account_status || '',
            block_type: user.block_type || null,
            paid_by_staff_name: staff.name || null
        };
    },
    create({ request_id, user_id, fine_type, amount }) {
        const d = load();
        const newFine = {
            id: nextId(d.fines),
            request_id: Number(request_id), user_id: Number(user_id),
            fine_type, amount: Number(amount),
            fine_status: 'Unpaid',
            paid_confirmed_by: null, paid_at: null,
            created_at: new Date().toISOString()
        };
        d.fines.push(newFine);
        return newFine.id;
    },
    findByUserId(userId) {
        const d = load();
        return d.fines.filter(f => f.user_id === Number(userId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(f => this._enrich(f));
    },
    findByRequestId(requestId) {
        return load().fines.filter(f => f.request_id === Number(requestId));
    },
    countUnpaidByUser(userId) {
        return load().fines.filter(f => f.user_id === Number(userId) && f.fine_status === 'Unpaid').length;
    },
    markPaid(id, paidConfirmedBy) {
        const d = load();
        const f = d.fines.find(f => f.id === Number(id));
        if (f) { f.fine_status = 'Paid'; f.paid_at = new Date().toISOString(); f.paid_confirmed_by = paidConfirmedBy; }
    },
    findAllUnpaid() {
        const d = load();
        return d.fines.filter(f => f.fine_status === 'Unpaid')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(f => this._enrich(f));
    }
};

// ─────────────────────────────────────────────
// SETTINGS helpers
// ─────────────────────────────────────────────

const Settings = {
    get(key) {
        const d = load();
        const s = d.settings.find(s => s.key === key);
        return s ? s.value : null;
    },
    set(key, value) {
        const d = load();
        const s = d.settings.find(s => s.key === key);
        if (s) s.value = String(value);
        else d.settings.push({ key, value: String(value) });
    },
    getAll() {
        return load().settings;
    }
};

// ─────────────────────────────────────────────
// AUDIT LOG helpers
// ─────────────────────────────────────────────

const AuditLog = {
    _enrich(log) {
        const d = load();
        const actor = d.users.find(u => u.id === log.actor_id) || {};
        return { ...log, actor_name: actor.name || 'System', actor_email: actor.email || '', actor_role: actor.role || '' };
    },
    create({ actor_id, action, target_type = null, target_id = null, details = null }) {
        const d = load();
        const newLog = {
            id: nextId(d.audit_logs),
            actor_id: Number(actor_id), action, target_type, target_id, details,
            created_at: new Date().toISOString()
        };
        d.audit_logs.push(newLog);
        return newLog.id;
    },
    findAll() {
        const d = load();
        return [...d.audit_logs]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(l => this._enrich(l));
    }
};

module.exports = {
    User, EquipmentType, EquipmentCopy, Request, Fine, Settings, AuditLog,
    isLoaded: () => data !== null,
    reload: () => { data = null; load(); }
};
