const bcrypt = require('bcrypt');
const User = require('../models/User');

const authController = {
    // GET /auth/login
    getLogin(req, res) {
        res.render('auth/login', { title: 'Login — UELS', layout: 'layouts/main' });
    },

    // GET /auth/signup
    getSignup(req, res) {
        res.render('auth/signup', { title: 'Sign Up — UELS', layout: 'layouts/main' });
    },

    // POST /auth/signup
    async signup(req, res) {
        try {
            const { name, email, password, password2, role } = req.body;

            // Validation
            if (!name || !email || !password || !password2 || !role) {
                req.flash('error_msg', 'Please fill in all fields.');
                return res.redirect('/auth/signup');
            }

            if (password !== password2) {
                req.flash('error_msg', 'Passwords do not match.');
                return res.redirect('/auth/signup');
            }

            if (password.length < 6) {
                req.flash('error_msg', 'Password must be at least 6 characters.');
                return res.redirect('/auth/signup');
            }

            // Only Student and Faculty can self-register
            if (!['Student', 'Faculty'].includes(role)) {
                req.flash('error_msg', 'Invalid role selected.');
                return res.redirect('/auth/signup');
            }

            // EWU Email Domain Validation
            const emailLower = email.trim().toLowerCase();
            if (role === 'Student' && !emailLower.endsWith('@std.ewubd.edu')) {
                req.flash('error_msg', 'Students must register with their @std.ewubd.edu email address.');
                return res.redirect('/auth/signup');
            }
            if (role === 'Faculty' && !emailLower.endsWith('@ewubd.edu')) {
                req.flash('error_msg', 'Faculty must register with their @ewubd.edu email address.');
                return res.redirect('/auth/signup');
            }


            // Check duplicate email
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                req.flash('error_msg', 'An account with that email already exists.');
                return res.redirect('/auth/signup');
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            // Create user (in fallback mode, also store plaintext demo_password for demo login)
            const db = require('../config/db');
            if (!db.isAvailable()) {
                const fallback = require('../config/fallback');
                fallback.User.create({ name, email, password_hash, role });
                // Patch demo_password into the newly created user
                const newUser = fallback.User.findByEmail(email);
                if (newUser) newUser.demo_password = password;
            } else {
                await User.create({ name, email, password_hash, role });
            }

            req.flash('success_msg', 'Signup successful! You can now log in.');
            res.redirect('/auth/login');
        } catch (err) {
            console.error('Signup error:', err);
            req.flash('error_msg', 'Something went wrong. Please try again.');
            res.redirect('/auth/signup');
        }
    },

    // POST /auth/login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                req.flash('error_msg', 'Please enter both email and password.');
                return res.redirect('/auth/login');
            }

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                req.flash('error_msg', 'Invalid credentials.');
                return res.redirect('/auth/login');
            }

            // Compare password — supports both bcrypt (DB mode) and demo plaintext (fallback mode)
            let isMatch = false;
            const db = require('../config/db');
            if (db.isAvailable()) {
                // Normal mode: bcrypt compare
                isMatch = await bcrypt.compare(password, user.password_hash);
            } else {
                // Fallback / Demo mode: compare against demo_password field
                if (user.demo_password) {
                    isMatch = (password === user.demo_password);
                } else {
                    // Try bcrypt anyway (for newly signed-up users in fallback mode)
                    try { isMatch = await bcrypt.compare(password, user.password_hash); } catch { isMatch = false; }
                }
            }

            if (!isMatch) {
                req.flash('error_msg', 'Invalid credentials.');
                return res.redirect('/auth/login');
            }

            // Set session
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                account_status: user.account_status
            };

            // Redirect based on role
            switch (user.role) {
                case 'Admin':
                    return res.redirect('/admin/dashboard');
                case 'Staff':
                    return res.redirect('/staff/dashboard');
                case 'Student':
                case 'Faculty':
                    return res.redirect('/student/dashboard');
                default:
                    return res.redirect('/');
            }
        } catch (err) {
            console.error('Login error:', err);
            req.flash('error_msg', 'Something went wrong. Please try again.');
            res.redirect('/auth/login');
        }
    },

    // GET /auth/logout
    logout(req, res) {
        req.session.destroy((err) => {
            if (err) console.error('Logout error:', err);
            res.redirect('/auth/login');
        });
    }
};

module.exports = authController;
