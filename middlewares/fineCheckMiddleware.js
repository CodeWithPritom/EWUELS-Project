const db       = require('../config/db');
const fallback = require('../config/fallback');
const Fine     = require('../models/Fine');
const AuditLog = require('../models/AuditLog');
const { calculateLateFine } = require('../utils/fineCalculator');
const { blockUserAndCancelRequests } = require('../utils/blockHelper');

async function fineCheckMiddleware(req, res, next) {
    try {
        if (!req.session || !req.session.user) {
            return next();
        }

        const userId = req.session.user.id;

        // Find all Issued requests for this user where due_at < NOW()
        let overdueRequests = [];
        try {
            const [rows] = await db.query(`
                SELECT r.*, et.name as equipment_name, ec.unique_code
                FROM requests r
                JOIN equipment_copies ec ON r.copy_id = ec.id
                JOIN equipment_types et ON ec.equipment_type_id = et.id
                WHERE r.user_id = ? AND r.status = 'Issued' AND r.due_at < NOW()
            `, [userId]);
            overdueRequests = rows;
        } catch {
            // Fallback: use in-memory store
            overdueRequests = fallback.Request.findIssuedOverdue().filter(r => r.user_id === Number(userId));
        }

        if (overdueRequests.length > 0) {
            // Fetch fine rates from settings
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

            for (const request of overdueRequests) {
                // Check if a Late fine already exists for this request
                const existingFines = await Fine.findByRequestId(request.id);
                const hasLateFine = existingFines.some(f => f.fine_type === 'Late');

                if (!hasLateFine) {
                    const lateFineAmount = calculateLateFine(request, rateDay, rateMinute);

                    if (lateFineAmount > 0) {
                        await Fine.create({
                            request_id: request.id,
                            user_id: userId,
                            fine_type: 'Late',
                            amount: lateFineAmount
                        });

                        // Auto-block user and cancel pending/reserved requests
                        await blockUserAndCancelRequests(
                            userId,
                            'Auto',
                            `Overdue equipment: ${request.equipment_name} (${request.unique_code})`,
                            null
                        );

                        await AuditLog.create({
                            actor_id: userId,
                            action: 'AUTO_FINE_AND_BLOCK',
                            target_type: 'request',
                            target_id: request.id,
                            details: `On-demand fine check generated Late fine ৳${lateFineAmount} and auto-blocked user.`
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Fine check middleware error:', err);
    }
    next();
}

module.exports = fineCheckMiddleware;
