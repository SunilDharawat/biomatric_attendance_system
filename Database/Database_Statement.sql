CREATE DATABASE IF NOT EXISTS biometric_attendance;
USE biometric_attendance;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin') DEFAULT 'employee',
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    check_in DATETIME,
    check_out DATETIME,
    latitude_in DECIMAL(10,8),
    longitude_in DECIMAL(11,8),
    latitude_out DECIMAL(10,8),
    longitude_out DECIMAL(11,8),
    device_id VARCHAR(255),
    notes TEXT,
    status ENUM('present', 'absent', 'late', 'half_day') DEFAULT 'present',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



CREATE TABLE user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    biometric_enabled BOOLEAN DEFAULT FALSE,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_device (user_id, device_id)
);

CREATE TABLE company_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE attendance_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    check_in_time TIME DEFAULT '09:00:00',
    check_out_time TIME DEFAULT '18:00:00',
    late_threshold_minutes INT DEFAULT 15,
    location_radius_meters INT DEFAULT 100,
    office_latitude DECIMAL(10,8),
    office_longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_attendance_user_date ON attendance(user_id, check_in);
CREATE INDEX idx_attendance_date ON attendance(check_in);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);



INSERT INTO users (name, email, password_hash, role, employee_id) VALUES 
('System Admin', 'admin@company.com', '$2a$10$8K1p/a9/8JNM7zY6J5J6G.H3CYD1N3Y1X2Y3Z4A5B6C7D8E9F0G1H2', 'admin', 'ADMIN001');


INSERT INTO company_settings (setting_key, setting_value, description) VALUES 
('company_name', 'Smart Attendance Corp', 'Company name for reports'),
('working_hours_start', '09:00', 'Standard work start time'),
('working_hours_end', '18:00', 'Standard work end time'),
('late_threshold', '15', 'Minutes after which employee is marked late'),
('location_radius', '100', 'Allowed radius from office location in meters');


INSERT INTO attendance_rules (rule_name, office_latitude, office_longitude) VALUES 
('Default Office Rule', 23.2599, 77.4126); -- Bhopal coordinates as example


INSERT INTO users (name, email, password_hash, role, employee_id, department, phone) VALUES 
('John Doe', 'john.doe@company.com', '$2a$10$8K1p/a9/8JNM7zY6J5J6G.H3CYD1N3Y1X2Y3Z4A5B6C7D8E9F0G1H2', 'employee', 'EMP001', 'IT', '+91-9876543210'),
('Jane Smith', 'jane.smith@company.com', '$2a$10$8K1p/a9/8JNM7zY6J5J6G.H3CYD1N3Y1X2Y3Z4A5B6C7D8E9F0G1H2', 'employee', 'EMP002', 'HR', '+91-9876543211'),
('Mike Johnson', 'mike.johnson@company.com', '$2a$10$8K1p/a9/8JNM7zY6J5J6G.H3CYD1N3Y1X2Y3Z4A5B6C7D8E9F0G1H2', 'employee', 'EMP003', 'Finance', '+91-9876543212');


CREATE VIEW attendance_report AS
SELECT 
    u.id as user_id,
    u.name,
    u.employee_id,
    u.department,
    a.id as attendance_id,
    DATE(a.check_in) as attendance_date,
    TIME(a.check_in) as check_in_time,
    TIME(a.check_out) as check_out_time,
    TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out) as total_minutes,
    a.status,
    a.latitude_in,
    a.longitude_in,
    CASE 
        WHEN TIME(a.check_in) > '09:15:00' THEN 'Late'
        WHEN a.check_out IS NULL THEN 'Incomplete'
        ELSE 'On Time'
    END as punctuality_status
FROM users u
LEFT JOIN attendance a ON u.id = a.user_id
WHERE u.role = 'employee'
ORDER BY a.check_in DESC;