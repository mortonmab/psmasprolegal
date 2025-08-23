-- Migration: Add general compliance records table
-- This table stores various compliance documents and renewals that need to be tracked

CREATE TABLE IF NOT EXISTS general_compliance_records (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  compliance_type ENUM('tax_return', 'license_renewal', 'certification', 'registration', 'permit', 'insurance', 'audit', 'report', 'other') NOT NULL,
  due_date DATE NOT NULL,
  due_day INT NULL, -- Day of month for recurring items (1-31)
  expiry_date DATE,
  renewal_date DATE,
  frequency ENUM('once', 'monthly', 'quarterly', 'annually', 'biennially', 'custom') NOT NULL DEFAULT 'once',
  status ENUM('active', 'pending', 'overdue', 'completed', 'expired') NOT NULL DEFAULT 'active',
  priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  assigned_to VARCHAR(36),
  department_id VARCHAR(36),
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_compliance_type (compliance_type),
  INDEX idx_due_date (due_date),
  INDEX idx_due_day (due_day),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_department_id (department_id),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample data for common compliance requirements
-- Note: Replace the UUID() in created_by with actual user IDs from your users table
-- You can run this after creating the table and having users in the system
