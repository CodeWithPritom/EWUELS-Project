CREATE DATABASE IF NOT EXISTS uels_db;
USE uels_db;

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

CREATE TABLE IF NOT EXISTS equipment_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    unique_code VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('Available','Pending','Reserved','Issued','Maintenance') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id)
);

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

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    value VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Default Settings
INSERT IGNORE INTO settings (`key`, value) VALUES
('late_fine_rate_per_day', '50'),
('late_fine_rate_per_minute', '1');

-- Seed Admin User (password is 'admin123' pre-hashed with bcrypt 10 rounds)
INSERT IGNORE INTO users (name, email, password_hash, role, account_status)
VALUES ('System Admin', 'admin@uels.edu', '$2b$10$7vj.H8s48J59dY81zI5v.Oe47u1YjV3cE8T1OqJp/yZfXF/G8oY4q', 'Admin', 'Active');
