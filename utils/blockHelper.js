const db       = require('../config/db');
const fallback = require('../config/fallback');

/**
 * Blocks a user and auto-cancels all their Pending and Reserved requests.
 * Works with both MySQL and JSON fallback.
 */
async function blockUserAndCancelRequests(userId, blockType = 'Auto', reason = 'Unpaid fine', blockedBy = null) {
    try {
        // 1. Update user status in DB
        await db.query(
            'UPDATE users SET account_status = ?, block_type = ?, block_reason = ?, blocked_by = ? WHERE id = ?',
            ['Blocked', blockType, reason, blockedBy, userId]
        );

        // 2. Find all Pending and Approved (Reserved) requests for this user
        const [requests] = await db.query(
            "SELECT id, copy_id FROM requests WHERE user_id = ? AND status IN ('Pending', 'Approved')",
            [userId]
        );

        // 3. Auto-cancel each request and release its equipment copy
        for (const req of requests) {
            await db.query(
                "UPDATE requests SET status = 'Cancelled', cancelled_by = 'System' WHERE id = ?",
                [req.id]
            );
            await db.query(
                "UPDATE equipment_copies SET status = 'Available' WHERE id = ?",
                [req.copy_id]
            );
        }
    } catch {
        // Fallback: mutate in-memory store
        fallback.User.updateStatus(userId, 'Blocked', blockType, reason, blockedBy);

        const pendingRequests = fallback.Request.findByUserId(userId)
            .filter(r => ['Pending', 'Approved'].includes(r.status));

        for (const req of pendingRequests) {
            fallback.Request.cancel(req.id, 'System');
            fallback.EquipmentCopy.updateStatus(req.copy_id, 'Available');
        }
    }
}

module.exports = { blockUserAndCancelRequests };
