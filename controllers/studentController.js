const pool = require('../config/db');
const EquipmentType = require('../models/EquipmentType');
const EquipmentCopy = require('../models/EquipmentCopy');
const Request = require('../models/Request');
const Fine = require('../models/Fine');
const User = require('../models/User');

const studentController = {
    // GET /student/dashboard
    async dashboard(req, res) {
        try {
            const userId = req.session.user.id;
            const activeRequests = await Request.countActiveByUserId(userId);
            const unpaidFines = await Fine.countUnpaidByUser(userId);

            res.render('student/dashboard', {
                title: 'Dashboard — UELS',
                stats: { activeRequests, unpaidFines }
            });
        } catch (err) {
            console.error('Student dashboard error:', err);
            req.flash('error_msg', 'Failed to load dashboard.');
            res.redirect('/');
        }
    },

    // GET /student/browse
    async browse(req, res) {
        try {
            const types = await EquipmentType.findAllWithCopyCounts();
            const available = types.filter(t => t.available_copies > 0);
            const unavailable = types.filter(t => t.available_copies === 0 && t.total_copies > 0);

            res.render('student/browse', {
                title: 'Browse Equipment — UELS',
                available,
                unavailable
            });
        } catch (err) {
            console.error('Browse error:', err);
            req.flash('error_msg', 'Failed to load equipment catalog.');
            res.redirect('/student/dashboard');
        }
    },

    // GET /student/request/:typeId
    async requestForm(req, res) {
        try {
            const type = await EquipmentType.findById(req.params.typeId);
            if (!type) {
                req.flash('error_msg', 'Equipment type not found.');
                return res.redirect('/student/browse');
            }

            const availableCopies = await EquipmentCopy.findAvailableByType(req.params.typeId);
            if (availableCopies.length === 0) {
                req.flash('error_msg', 'No available copies for this equipment.');
                return res.redirect('/student/browse');
            }

            res.render('student/request', {
                title: `Request ${type.name} — UELS`,
                type,
                availableCount: availableCopies.length
            });
        } catch (err) {
            console.error('Request form error:', err);
            req.flash('error_msg', 'Failed to load request form.');
            res.redirect('/student/browse');
        }
    },

    // POST /student/request/:typeId
    async submitRequest(req, res) {
        try {
            const userId = req.session.user.id;
            const typeId = req.params.typeId;
            const { purpose, duration_type, duration_value } = req.body;

            if (!purpose || !duration_type || !duration_value) {
                req.flash('error_msg', 'All fields are required.');
                return res.redirect(`/student/request/${typeId}`);
            }

            const durationVal = parseInt(duration_value);
            if (isNaN(durationVal) || durationVal < 1) {
                req.flash('error_msg', 'Invalid duration value.');
                return res.redirect(`/student/request/${typeId}`);
            }

            if (duration_type === 'Day' && durationVal < 1) {
                req.flash('error_msg', 'Minimum duration is 1 day.');
                return res.redirect(`/student/request/${typeId}`);
            }

            if (duration_type === 'Minute' && durationVal < 2) {
                req.flash('error_msg', 'Minimum duration is 2 minutes.');
                return res.redirect(`/student/request/${typeId}`);
            }

            // Check user is not blocked
            const user = await User.findById(userId);
            if (user.account_status === 'Blocked') {
                req.flash('error_msg', 'Your account is blocked. You cannot submit requests.');
                return res.redirect('/student/blocked');
            }

            // Check user has no unpaid fines
            const unpaidCount = await Fine.countUnpaidByUser(userId);
            if (unpaidCount > 0) {
                req.flash('error_msg', 'You have unpaid fines. Please clear them before making new requests.');
                return res.redirect('/student/my-fines');
            }

            const availableCopies = await EquipmentCopy.findAvailableByType(typeId);
            if (availableCopies.length === 0) {
                req.flash('error_msg', 'No available copies. Someone may have just taken the last one.');
                return res.redirect('/student/browse');
            }

            const copy = availableCopies[0];
            await EquipmentCopy.updateStatus(copy.id, 'Pending');
            await Request.create({
                user_id: userId,
                copy_id: copy.id,
                purpose,
                duration_type,
                duration_value: durationVal
            });

            req.flash('success_msg', `Request submitted for ${copy.unique_code}! Waiting for staff approval.`);
            res.redirect('/student/my-requests');
        } catch (err) {
            console.error('Submit request error:', err);
            req.flash('error_msg', 'Failed to submit request.');
            res.redirect('/student/browse');
        }
    },

    // GET /student/my-requests
    async myRequests(req, res) {
        try {
            const requests = await Request.findByUserId(req.session.user.id);
            res.render('student/myRequests', {
                title: 'My Requests — UELS',
                requests
            });
        } catch (err) {
            console.error('My requests error:', err);
            req.flash('error_msg', 'Failed to load requests.');
            res.redirect('/student/dashboard');
        }
    },

    // POST /student/cancel/:requestId
    async cancelRequest(req, res) {
        try {
            const requestId = req.params.requestId;
            const userId = req.session.user.id;

            const request = await Request.findById(requestId);
            if (!request || request.user_id !== userId || request.status !== 'Approved') {
                req.flash('error_msg', 'Invalid cancel request.');
                return res.redirect('/student/my-requests');
            }

            const reservedAt = new Date(request.reserved_at);
            const now = new Date();
            const elapsedMs = now.getTime() - reservedAt.getTime();
            if (elapsedMs > 5 * 60 * 1000) {
                req.flash('error_msg', 'Cancel window has expired. Only staff can cancel this request now.');
                return res.redirect('/student/my-requests');
            }

            await Request.cancel(requestId, 'Student');
            await EquipmentCopy.updateStatus(request.copy_id, 'Available');

            req.flash('success_msg', 'Request cancelled successfully.');
            res.redirect('/student/my-requests');
        } catch (err) {
            console.error('Cancel request error:', err);
            req.flash('error_msg', 'Failed to cancel request.');
            res.redirect('/student/my-requests');
        }
    },

    // GET /student/my-fines
    async myFines(req, res) {
        try {
            const fines = await Fine.findByUserId(req.session.user.id);
            res.render('student/myFines', {
                title: 'My Fines — UELS',
                fines
            });
        } catch (err) {
            console.error('My fines error:', err);
            req.flash('error_msg', 'Failed to load fines.');
            res.redirect('/student/dashboard');
        }
    },

    // GET /student/blocked
    async blockedPage(req, res) {
        try {
            const user = await User.findById(req.session.user.id);
            const fines = await Fine.findByUserId(req.session.user.id);
            const unpaidFines = fines.filter(f => f.fine_status === 'Unpaid');

            res.render('student/blocked', {
                title: 'Account Blocked — UELS',
                user,
                unpaidFines
            });
        } catch (err) {
            console.error('Blocked page error:', err);
            res.render('student/blocked', { title: 'Account Blocked — UELS', user: req.session.user, unpaidFines: [] });
        }
    }
};

module.exports = studentController;
