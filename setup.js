require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL Server...');
        // 1. Connect without database to create it
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        const dbName = process.env.DB_NAME || 'uels_db';

        console.log(`Creating database ${dbName} if it doesn't exist...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);

        console.log(`Switching to database ${dbName}...`);
        await connection.query(`USE \`${dbName}\`;`);

        // 2. Create all tables
        console.log('Creating tables...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Student','Faculty','Staff','Admin') NOT NULL,
                account_status ENUM('Active','Blocked') DEFAULT 'Active',
                block_type ENUM('Auto','Manual') NULL,
                block_reason TEXT NULL,
                blocked_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (blocked_by) REFERENCES users(id)
            );
        `);
        console.log('  ✓ users');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS equipment_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT NULL,
                image_url VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✓ equipment_types');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS equipment_copies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                equipment_type_id INT NOT NULL,
                unique_code VARCHAR(20) NOT NULL UNIQUE,
                status ENUM('Available','Pending','Reserved','Issued','Maintenance') DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id)
            );
        `);
        console.log('  ✓ equipment_copies');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                copy_id INT NOT NULL,
                purpose TEXT NOT NULL,
                duration_type ENUM('Day','Minute') NOT NULL,
                duration_value INT NOT NULL,
                status ENUM('Pending','Approved','Rejected','Cancelled','Issued','Returned') DEFAULT 'Pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at DATETIME NULL,
                reserved_at DATETIME NULL,
                issued_at DATETIME NULL,
                due_at DATETIME NULL,
                returned_at DATETIME NULL,
                return_condition ENUM('Good','Damaged') NULL,
                cancelled_by ENUM('Student','Staff','System') NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (copy_id) REFERENCES equipment_copies(id)
            );
        `);
        console.log('  ✓ requests');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS fines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id INT NOT NULL,
                user_id INT NOT NULL,
                fine_type ENUM('Late','Damage') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                fine_status ENUM('Unpaid','Paid') DEFAULT 'Unpaid',
                paid_confirmed_by INT NULL,
                paid_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES requests(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (paid_confirmed_by) REFERENCES users(id)
            );
        `);
        console.log('  ✓ fines');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                actor_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50) NULL,
                target_id INT NULL,
                details TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (actor_id) REFERENCES users(id)
            );
        `);
        console.log('  ✓ audit_logs');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                \`key\` VARCHAR(50) NOT NULL UNIQUE,
                value VARCHAR(100) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✓ settings');

        // 3. Seed default settings
        console.log('Seeding default settings...');
        const fineRateDay = process.env.DEFAULT_FINE_RATE_PER_DAY || '50';
        const fineRateMinute = process.env.DEFAULT_FINE_RATE_PER_MINUTE || '1';

        await connection.query(`
            INSERT IGNORE INTO settings (\`key\`, value) VALUES
            ('late_fine_rate_per_day', ?),
            ('late_fine_rate_per_minute', ?);
        `, [fineRateDay, fineRateMinute]);
        console.log('  ✓ Default fine rates set');

        // 4. Seed Admin account with live bcrypt hash
        console.log('Seeding Admin account...');
        const adminName = process.env.ADMIN_NAME || 'System Admin';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@uels.edu';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if admin already exists
        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (existing.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            await connection.query(
                'INSERT INTO users (name, email, password_hash, role, account_status) VALUES (?, ?, ?, ?, ?)',
                [adminName, adminEmail, hashedPassword, 'Admin', 'Active']
            );
            console.log(`  ✓ Admin account created: ${adminEmail}`);
        } else {
            console.log(`  ✓ Admin account already exists: ${adminEmail}`);
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log(`   Database: ${dbName}`);
        console.log(`   Admin: ${adminEmail} / ${adminPassword}`);

    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
