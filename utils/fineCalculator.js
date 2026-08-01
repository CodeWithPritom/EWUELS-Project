/**
 * Calculates late fine based on request due_at and current time (or return time).
 * @param {Object} request - Must contain due_at, duration_type
 * @param {number} ratePerDay - Rate per day from settings or default
 * @param {number} ratePerMinute - Rate per minute from settings or default
 * @param {Date} [returnTime] - Optional return time (defaults to NOW)
 * @returns {number} fine amount (0 if not overdue)
 */
function calculateLateFine(request, ratePerDay = 50, ratePerMinute = 1, returnTime = new Date()) {
    if (!request || !request.due_at) return 0;

    const dueAt = new Date(request.due_at);
    const endTime = new Date(returnTime);

    if (endTime <= dueAt) {
        return 0; // Not overdue
    }

    const diffMs = endTime.getTime() - dueAt.getTime();

    if (request.duration_type === 'Minute') {
        const overdueMinutes = Math.ceil(diffMs / (1000 * 60));
        return overdueMinutes * ratePerMinute;
    } else {
        // Day
        const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return overdueDays * ratePerDay;
    }
}

module.exports = { calculateLateFine };
