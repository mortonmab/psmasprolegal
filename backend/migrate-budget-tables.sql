-- Budget Management System Tables
-- This migration creates the necessary tables for comprehensive budget management

-- 1. Budget Categories Table
CREATE TABLE IF NOT EXISTS budget_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI display
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    period_type ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('draft', 'active', 'closed', 'archived') NOT NULL DEFAULT 'draft',
    department_id VARCHAR(36),
    created_by VARCHAR(36) NOT NULL,
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Budget Allocations Table
CREATE TABLE IF NOT EXISTS budget_allocations (
    id VARCHAR(36) PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_budget_category (budget_id, category_id)
);

-- 4. Budget Expenditures Table
CREATE TABLE IF NOT EXISTS budget_expenditures (
    id VARCHAR(36) PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    vendor_id VARCHAR(36),
    invoice_number VARCHAR(255),
    receipt_url VARCHAR(1000),
    status ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Budget Transfers Table (for moving funds between categories)
CREATE TABLE IF NOT EXISTS budget_transfers (
    id VARCHAR(36) PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    from_category_id VARCHAR(36) NOT NULL,
    to_category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (from_category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (to_category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Budget Reports Table (for storing generated reports)
CREATE TABLE IF NOT EXISTS budget_reports (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    report_type ENUM('summary', 'detailed', 'forecast', 'variance') NOT NULL,
    budget_id VARCHAR(36),
    date_range_start DATE,
    date_range_end DATE,
    report_data JSON,
    file_path VARCHAR(1000),
    generated_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_budgets_period ON budgets(period_type, start_date, end_date);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_department ON budgets(department_id);
CREATE INDEX idx_budget_allocations_budget ON budget_allocations(budget_id);
CREATE INDEX idx_budget_expenditures_budget ON budget_expenditures(budget_id);
CREATE INDEX idx_budget_expenditures_category ON budget_expenditures(category_id);
CREATE INDEX idx_budget_expenditures_date ON budget_expenditures(expense_date);
CREATE INDEX idx_budget_expenditures_status ON budget_expenditures(status);
CREATE INDEX idx_budget_transfers_budget ON budget_transfers(budget_id);
CREATE INDEX idx_budget_transfers_status ON budget_transfers(status);

-- Insert default budget categories (using existing user ID)
INSERT INTO budget_categories (id, name, description, color, created_by) VALUES
('cat-001', 'Staff Salaries', 'Regular staff and contractor payments', '#3B82F6', 'legal-user-001'),
('cat-002', 'Office Expenses', 'Rent, utilities, and office supplies', '#10B981', 'legal-user-001'),
('cat-003', 'Technology', 'Software licenses, hardware, and IT services', '#F59E0B', 'legal-user-001'),
('cat-004', 'Marketing', 'Advertising, promotional activities, and events', '#EF4444', 'legal-user-001'),
('cat-005', 'Professional Development', 'Training, certifications, and conferences', '#8B5CF6', 'legal-user-001'),
('cat-006', 'Legal Services', 'External legal counsel and legal research', '#06B6D4', 'legal-user-001'),
('cat-007', 'Travel & Entertainment', 'Business travel and client entertainment', '#84CC16', 'legal-user-001'),
('cat-008', 'Insurance', 'Professional liability and general insurance', '#F97316', 'legal-user-001'),
('cat-009', 'Equipment', 'Office furniture and equipment purchases', '#EC4899', 'legal-user-001'),
('cat-010', 'Miscellaneous', 'Other operational expenses', '#6B7280', 'legal-user-001')
ON DUPLICATE KEY UPDATE name = VALUES(name);
