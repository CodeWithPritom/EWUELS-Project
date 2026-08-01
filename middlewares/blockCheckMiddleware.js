const User = require('../models/User');

async function blockCheckMiddleware(req, res, next) {
    if (!req.session || !req.session.user) {
        return next();
    }

    // Re-fetch the user from DB to get the latest account_status
    const user = await User.findById(req.session.user.id);
    if (!user) {
        req.session.destroy();
        return res.redirect('/auth/login');
    }

    // Update session with latest status
    req.session.user.account_status = user.account_status;

    if (user.account_status === 'Blocked') {
        // Allow access to these read-only routes even when blocked
        // Note: req.path is relative to the router mount point (e.g., /blocked, /my-requests)
        const allowedPaths = [
            '/blocked',
            '/my-requests',
            '/my-fines'
        ];

        if (allowedPaths.includes(req.path)) {
            return next();
        }

        return res.redirect('/student/blocked');
    }

    next();
}

module.exports = blockCheckMiddleware;
