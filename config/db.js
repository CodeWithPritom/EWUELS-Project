/**
 * db.js - Database connection with JSON Fallback
 *
 * If MySQL is unavailable (connection error), the system falls back
 * to reading from /data/seed_data.json for read operations.
 * Write operations in fallback mode are no-ops (demo mode only).
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isDbAvailable = true; // starts optimistic, verified on first query

try {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'uels_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000
    });
} catch (err) {
    console.warn('[UELS] ⚠️  DB pool creation failed. Running in FALLBACK mode.');
    isDbAvailable = false;
}

/**
 * Test DB availability once on startup
 */
async function testConnection() {
    if (!pool) { isDbAvailable = false; return; }
    try {
        const conn = await pool.getConnection();
        conn.release();
        console.log('[UELS] ✅ Database connected successfully.');
        isDbAvailable = true;
    } catch (err) {
        console.warn('[UELS] ⚠️  Database unavailable. Switching to FALLBACK (JSON) mode.');
        console.warn(`       Reason: ${err.message}`);
        isDbAvailable = false;
    }
}

testConnection();

/**
 * Wrapped query: tries MySQL, falls back silently on failure.
 * @returns [rows, fields] just like mysql2 promise pool.query
 */
async function query(sql, params) {
    if (isDbAvailable && pool) {
        try {
            const result = await pool.query(sql, params);
            return result;
        } catch (err) {
            // Mark DB unavailable after first runtime failure
            console.error('[UELS] DB query failed, switching to fallback:', err.message);
            isDbAvailable = false;
            throw err; // rethrow so models handle it
        }
    }
    throw new Error('DB_UNAVAILABLE');
}

module.exports = {
    query,
    isAvailable: () => isDbAvailable,
    rawPool: pool
};
