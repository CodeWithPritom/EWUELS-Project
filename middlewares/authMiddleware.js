function authMiddleware(req, res, next) {
    if (req.session && req.session.user) {
        // Attach user to res.locals for EJS templates
        res.locals.user = req.session.user;
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page.');
    res.redirect('/auth/login');
}

module.exports = authMiddleware;
