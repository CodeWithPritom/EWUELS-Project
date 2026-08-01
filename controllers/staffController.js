const db       = require('../config/db');
const fallback = require('../config/fallback');
const Request = require('../models/Request');
const EquipmentCopy = require('../models/EquipmentCopy');
const Fine = require('../models/Fine');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { calculateLateFine } = require('../utils/fineCalculator');
const { blockUserAndCancelRequests } = require('../utils/blockHelper');

const staffController = {
    // GET /staff/dashboard
    async dashboard(req, res) {
        try {
            const pendingCount = await Request.countByStatus('Pending');
            const reservedCount = await Request.countByStatus('Approved');
            const issuedCount = await Request.countByStatus('Issued');

            const [[{ overdueCount }]] = await pool.query(
                "SELECT COUNT(*) as overdueCount FROM requests WHERE status = 'Issued' AND due_at < NOW()"
            );

            res.render('staff/dashboard', {
                title: 'Staff Dashboard — UELS',
                stats: { pendingCount, reservedCount, issuedCount, overdueCount }
            });
        } catch (err) {
            console.error('Staff dashboard error:', err);
            req.flash('error_msg', 'Failed to load dashboard.');
            res.redirect('/');
        }
    },

    // GET /staff/pending
    async pendingRequests(req, res) {
        try {
            const requests = await Request.findPending();
            res.render('staff/pendingRequests', {
                title: 'Pending Requests — UELS',
                requests
            });
        } catch (err) {
            console.error('Pending requests error:', err);
            req.flash('error_msg', 'Failed to load pending requests.');
            res.redirect('/staff/dashboard');
        }
    },

    // POST /staff/approve/:requestId
    async approveRequest(req, res) {
        try {
            const requestId = req.params.requestId;
            const request = await Request.findById(requestId);

            if (!request || request.status !== 'Pending') {
                req.flash('error_msg', 'Request is no longer pending.');
                return res.redirect('/staff/pending');
            }

            const user = await User.findById(request.user_id);
            if (user.account_status === 'Blocked') {
                req.flash('error_msg', `Cannot approve: Student ${request.user_name} is currently Blocked.`);
                return res.redirect('/staff/pending');
            }

            const unpaidFines = await Fine.countUnpaidByUser(request.user_id);
            if (unpaidFines > 0) {
                req.flash('error_msg', `Cannot approve: Student ${request.user_name} has ${unpaidFines} unpaid fine(s).`);
                return res.redirect('/staff/pending');
            }

            await Request.approve(requestId);
            await EquipmentCopy.updateStatus(request.copy_id, 'Reserved');

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'APPROVE_REQUEST',
                target_type: 'request',
                target_id: requestId,
                details: `Approved request for ${request.equipment_name} (${request.unique_code}) by ${request.user_name}`
            });

            req.flash('success_msg', `Request approved for ${request.user_name}. Item reserved!`);
            res.redirect('/staff/pending');
        } catch (err) {
            console.error('Approve request error:', err);
            req.flash('error_msg', 'Failed to approve request.');
            res.redirect('/staff/pending');
        }
    },

    // POST /staff/reject/:requestId
    async rejectRequest(req, res) {
        try {
            const requestId = req.params.requestId;
            const request = await Request.findById(requestId);

            if (!request || request.status !== 'Pending') {
                req.flash('error_msg', 'Request is no longer pending.');
                return res.redirect('/staff/pending');
            }

            await Request.updateStatus(requestId, 'Rejected');
            await EquipmentCopy.updateStatus(request.copy_id, 'Available');

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'REJECT_REQUEST',
                target_type: 'request',
                target_id: requestId,
                details: `Rejected request for ${request.equipment_name} (${request.unique_code}) by ${request.user_name}`
            });

            req.flash('success_msg', `Request rejected. Equipment copy released.`);
            res.redirect('/staff/pending');
        } catch (err) {
            console.error('Reject request error:', err);
            req.flash('error_msg', 'Failed to reject request.');
            res.redirect('/staff/pending');
        }
    },

    // GET /staff/reserved
    async reservedList(req, res) {
        try {
            const requests = await Request.findByStatus('Approved');
            res.render('staff/reservedList', {
                title: 'Reserved Equipment — UELS',
                requests
            });
        } catch (err) {
            console.error('Reserved list error:', err);
            req.flash('error_msg', 'Failed to load reserved list.');
            res.redirect('/staff/dashboard');
        }
    },

    // POST /staff/cancel/:requestId
    async staffCancel(req, res) {
        try {
            const requestId = req.params.requestId;
            const request = await Request.findById(requestId);

            if (!request || request.status !== 'Approved') {
                req.flash('error_msg', 'Request cannot be cancelled.');
                return res.redirect('/staff/reserved');
            }

            await Request.cancel(requestId, 'Staff');
            await EquipmentCopy.updateStatus(request.copy_id, 'Available');

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'STAFF_CANCEL_REQUEST',
                target_type: 'request',
                target_id: requestId,
                details: `Staff cancelled reservation for ${request.equipment_name} (${request.unique_code})`
            });

            req.flash('success_msg', 'Reservation cancelled and item returned to available.');
            res.redirect('/staff/reserved');
        } catch (err) {
            console.error('Staff cancel error:', err);
            req.flash('error_msg', 'Failed to cancel reservation.');
            res.redirect('/staff/reserved');
        }
    },

    // POST /staff/issue/:requestId
    async issueEquipment(req, res) {
        try {
            const requestId = req.params.requestId;
            const request = await Request.findById(requestId);

            if (!request || request.status !== 'Approved') {
                req.flash('error_msg', 'Request is not in Approved status for issuing.');
                return res.redirect('/staff/reserved');
            }

            let intervalSql;
            if (request.duration_type === 'Day') {
                intervalSql = `DATE_ADD(NOW(), INTERVAL ${parseInt(request.duration_value)} DAY)`;
            } else {
                intervalSql = `DATE_ADD(NOW(), INTERVAL ${parseInt(request.duration_value)} MINUTE)`;
            }

            const [[{ dueAt }]] = await pool.query(`SELECT ${intervalSql} as dueAt`);

            await Request.issue(requestId, dueAt);
            await EquipmentCopy.updateStatus(request.copy_id, 'Issued');

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'ISSUE_EQUIPMENT',
                target_type: 'request',
                target_id: requestId,
                details: `Issued ${request.equipment_name} (${request.unique_code}) to ${request.user_name}. Due at: ${dueAt}`
            });

            req.flash('success_msg', `Equipment ${request.unique_code} issued to ${request.user_name}. Timer started!`);
            res.redirect('/staff/issued');
        } catch (err) {
            console.error('Issue equipment error:', err);
            req.flash('error_msg', 'Failed to issue equipment.');
            res.redirect('/staff/reserved');
        }
    },

    // GET /staff/issued
    async issuedList(req, res) {
        try {
            const requests = await Request.findByStatus('Issued');
            res.render('staff/issuedList', {
                title: 'Issued Equipment — UELS',
                requests
            });
        } catch (err) {
            console.error('Issued list error:', err);
            req.flash('error_msg', 'Failed to load issued items.');
            res.redirect('/staff/dashboard');
        }
    },

    // GET /staff/return/:requestId
    async returnForm(req, res) {
        try {
            const requestId = req.params.requestId;
            const request = await Request.findById(requestId);

            if (!request || request.status !== 'Issued') {
                req.flash('error_msg', 'Request is not currently issued.');
                return res.redirect('/staff/issued');
            }

            let rateDay = 50;
            let rateMinute = 1;
            try {
                const [settings] = await db.query("SELECT `key`, value FROM settings");
                settings.forEach(s => {
                    if (s.key === 'late_fine_rate_per_day') rateDay = parseFloat(s.value);
                    if (s.key === 'late_fine_rate_per_minute') rateMinute = parseFloat(s.value);
                });
            } catch {
                rateDay    = parseFloat(fallback.Settings.get('late_fine_rate_per_day'))    || 50;
                rateMinute = parseFloat(fallback.Settings.get('late_fine_rate_per_minute')) || 1;
            }

            const lateFinePreview = calculateLateFine(request, rateDay, rateMinute);
            const isOverdue = new Date() > new Date(request.due_at);

            res.render('staff/returnForm', {
                title: `Return ${request.unique_code} — UELS`,
                request,
                isOverdue,
                lateFinePreview,
                rateDay,
                rateMinute
            });
        } catch (err) {
            console.error('Return form error:', err);
            req.flash('error_msg', 'Failed to load return form.');
            res.redirect('/staff/issued');
        }
    },

    // POST /staff/return/:requestId
    async processReturn(req, res) {
        try {
            const requestId = req.params.requestId;
            const { return_condition, damage_fine_amount } = req.body;

            const request = await Request.findById(requestId);
            if (!request || request.status !== 'Issued') {
                req.flash('error_msg', 'Request is not currently issued.');
                return res.redirect('/staff/issued');
            }

            if (!['Good', 'Damaged'].includes(return_condition)) {
                req.flash('error_msg', 'Invalid condition selected.');
                return res.redirect(`/staff/return/${requestId}`);
            }

            await Request.returnEquipment(requestId, return_condition);
            const newCopyStatus = (return_condition === 'Damaged') ? 'Maintenance' : 'Available';
            await EquipmentCopy.updateStatus(request.copy_id, newCopyStatus);

            let finesCreated = [];

            let rateDay = 50;
            let rateMinute = 1;
            try {
                const [settings] = await db.query("SELECT `key`, value FROM settings");
                settings.forEach(s => {
                    if (s.key === 'late_fine_rate_per_day') rateDay = parseFloat(s.value);
                    if (s.key === 'late_fine_rate_per_minute') rateMinute = parseFloat(s.value);
                });
            } catch {
                rateDay    = parseFloat(fallback.Settings.get('late_fine_rate_per_day'))    || 50;
                rateMinute = parseFloat(fallback.Settings.get('late_fine_rate_per_minute')) || 1;
            }

            const lateFineAmount = calculateLateFine(request, rateDay, rateMinute);
            if (lateFineAmount > 0) {
                await Fine.create({
                    request_id: requestId,
                    user_id: request.user_id,
                    fine_type: 'Late',
                    amount: lateFineAmount
                });
                finesCreated.push(`Late fine: ৳${lateFineAmount}`);
            }

            if (return_condition === 'Damaged') {
                const dmgAmount = parseFloat(damage_fine_amount);
                if (!isNaN(dmgAmount) && dmgAmount > 0) {
                    await Fine.create({
                        request_id: requestId,
                        user_id: request.user_id,
                        fine_type: 'Damage',
                        amount: dmgAmount
                    });
                    finesCreated.push(`Damage fine: ৳${dmgAmount}`);
                }
            }

            if (finesCreated.length > 0) {
                await blockUserAndCancelRequests(
                    request.user_id,
                    'Auto',
                    `Fine incurred on return of ${request.equipment_name}: ${finesCreated.join(', ')}`,
                    req.session.user.id
                );
            }

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'RETURN_EQUIPMENT',
                target_type: 'request',
                target_id: requestId,
                details: `Returned ${request.equipment_name} (${request.unique_code}) condition: ${return_condition}. Fines: ${finesCreated.length > 0 ? finesCreated.join(', ') : 'None'}`
            });

            const msg = `Equipment returned (${return_condition}). ${finesCreated.length > 0 ? finesCreated.join(', ') + ' created and user auto-blocked.' : 'No fines.'}`;
            req.flash('success_msg', msg);
            res.redirect('/staff/issued');
        } catch (err) {
            console.error('Process return error:', err);
            req.flash('error_msg', 'Failed to process return.');
            res.redirect('/staff/issued');
        }
    },

    // ==========================================
    // FINE MANAGEMENT
    // ==========================================

    // GET /staff/fines
    async listFines(req, res) {
        try {
            const unpaidFines = await Fine.findAllUnpaid();
            res.render('staff/fineManagement', {
                title: 'Fine Management — UELS',
                fines: unpaidFines
            });
        } catch (err) {
            console.error('List fines error:', err);
            req.flash('error_msg', 'Failed to load unpaid fines.');
            res.redirect('/staff/dashboard');
        }
    },

    // POST /staff/fines/:fineId/pay
    async markFinePaid(req, res) {
        try {
            const fineId = req.params.fineId;
            const [rows] = await pool.query('SELECT * FROM fines WHERE id = ?', [fineId]);
            const fine = rows[0];

            if (!fine) {
                req.flash('error_msg', 'Fine record not found.');
                return res.redirect('/staff/fines');
            }

            // Mark fine as Paid
            await Fine.markPaid(fineId, req.session.user.id);

            // Check if all fines for this user are now paid
            const unpaidCount = await Fine.countUnpaidByUser(fine.user_id);
            const user = await User.findById(fine.user_id);

            let unblockedMessage = '';
            if (unpaidCount === 0) {
                if (user.block_type === 'Auto') {
                    // Auto-unblock!
                    await User.updateStatus(fine.user_id, 'Active', null, null, null);
                    unblockedMessage = ` All fines cleared and ${user.name} has been automatically UNBLOCKED!`;

                    await AuditLog.create({
                        actor_id: req.session.user.id,
                        action: 'AUTO_UNBLOCK_USER',
                        target_type: 'user',
                        target_id: fine.user_id,
                        details: `Auto-unblocked ${user.name} after all fines paid.`
                    });
                } else if (user.block_type === 'Manual') {
                    unblockedMessage = ` Note: ${user.name} has a Manual block and requires manual unblocking.`;
                }
            }

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'PAY_FINE',
                target_type: 'fine',
                target_id: fineId,
                details: `Marked fine ৳${fine.amount} as Paid for ${user.name}.`
            });

            req.flash('success_msg', `Fine of ৳${fine.amount} marked as Paid.${unblockedMessage}`);
            res.redirect('/staff/fines');
        } catch (err) {
            console.error('Mark fine paid error:', err);
            req.flash('error_msg', 'Failed to mark fine as paid.');
            res.redirect('/staff/fines');
        }
    },

    // ==========================================
    // BLOCK MANAGEMENT
    // ==========================================

    // GET /staff/blocks
    async listUsersForBlock(req, res) {
        try {
            const [users] = await pool.query(`
                SELECT u.*, 
                       (SELECT COUNT(*) FROM fines WHERE user_id = u.id AND fine_status = 'Unpaid') as unpaid_fines_count
                FROM users u
                WHERE u.role IN ('Student', 'Faculty')
                ORDER BY u.account_status DESC, u.name ASC
            `);

            res.render('staff/blockManagement', {
                title: 'Block Management — UELS',
                users
            });
        } catch (err) {
            console.error('List users for block error:', err);
            req.flash('error_msg', 'Failed to load user list.');
            res.redirect('/staff/dashboard');
        }
    },

    // POST /staff/blocks/:userId/block
    async manualBlock(req, res) {
        try {
            const userId = req.params.userId;
            const { reason } = req.body;

            if (!reason) {
                req.flash('error_msg', 'A reason is required to manually block a user.');
                return res.redirect('/staff/blocks');
            }

            const user = await User.findById(userId);
            if (!user) {
                req.flash('error_msg', 'User not found.');
                return res.redirect('/staff/blocks');
            }

            await blockUserAndCancelRequests(userId, 'Manual', reason, req.session.user.id);

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'MANUAL_BLOCK_USER',
                target_type: 'user',
                target_id: userId,
                details: `Manually blocked ${user.name}. Reason: ${reason}`
            });

            req.flash('success_msg', `User ${user.name} has been manually blocked and their pending/reserved requests cancelled.`);
            res.redirect('/staff/blocks');
        } catch (err) {
            console.error('Manual block error:', err);
            req.flash('error_msg', 'Failed to block user.');
            res.redirect('/staff/blocks');
        }
    },

    // POST /staff/blocks/:userId/unblock
    async manualUnblock(req, res) {
        try {
            const userId = req.params.userId;
            const user = await User.findById(userId);

            if (!user) {
                req.flash('error_msg', 'User not found.');
                return res.redirect('/staff/blocks');
            }

            await User.updateStatus(userId, 'Active', null, null, null);

            await AuditLog.create({
                actor_id: req.session.user.id,
                action: 'MANUAL_UNBLOCK_USER',
                target_type: 'user',
                target_id: userId,
                details: `Manually unblocked ${user.name}`
            });

            req.flash('success_msg', `User ${user.name} has been manually unblocked.`);
            res.redirect('/staff/blocks');
        } catch (err) {
            console.error('Manual unblock error:', err);
            req.flash('error_msg', 'Failed to unblock user.');
            res.redirect('/staff/blocks');
        }
    }
};

module.exports = staffController;
