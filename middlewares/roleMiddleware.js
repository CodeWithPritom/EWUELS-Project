function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            req.flash('error_msg', 'Please log in to access this page.');
            return res.redirect('/auth/login');
        }

        if (!allowedRoles.includes(req.session.user.role)) {
            return res.status(403).render('403', { title: '403 Forbidden — UELS' });
        }

        next();
    };
}

module.exports = requireRole;
