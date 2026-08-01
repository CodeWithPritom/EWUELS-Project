require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const app = express();

// Session store options
const sessionStoreOptions = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};
const db = require('./config/db');

// Session store setup with automatic MemoryStore fallback for offline/demo mode
const MemoryStore = session.MemoryStore;
const memoryStore = new MemoryStore();
let mySqlStore = null;

try {
    mySqlStore = new MySQLStore(sessionStoreOptions);
    mySqlStore.on('error', () => {
        // Suppress unhandled MySQLStore connection error logs when DB is offline
    });
} catch (e) {
    // Ignore MySQLStore init failure
}

class HybridSessionStore extends session.Store {
    get(sid, callback) {
        if (db.isAvailable() && mySqlStore) {
            mySqlStore.get(sid, (err, sessionData) => {
                if (err) return memoryStore.get(sid, callback);
                callback(null, sessionData);
            });
        } else {
            memoryStore.get(sid, callback);
        }
    }
    set(sid, sessionData, callback) {
        if (db.isAvailable() && mySqlStore) {
            mySqlStore.set(sid, sessionData, () => {});
        }
        memoryStore.set(sid, sessionData, callback);
    }
    destroy(sid, callback) {
        if (db.isAvailable() && mySqlStore) {
            mySqlStore.destroy(sid, () => {});
        }
        memoryStore.destroy(sid, callback);
    }
}

// EJS & Layouts Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session config
app.use(session({
    key: 'uels_session',
    secret: process.env.SESSION_SECRET || 'secret',
    store: new HybridSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Flash messages & locals
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/staff', staffRoutes);
app.use('/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'Admin': return res.redirect('/admin/dashboard');
            case 'Staff': return res.redirect('/staff/dashboard');
            case 'Faculty':
            case 'Student': return res.redirect('/student/dashboard');
        }
    }
    res.redirect('/auth/login');
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', { title: '404 Not Found — UELS' });
});

// Global Error Handler (500)
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    console.error('Global Error Handler:', err);
    res.status(500).render('404', { title: 'Server Error — UELS' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
