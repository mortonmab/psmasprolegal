-- Migration script to add missing fields to cases table
-- Run this script to update the existing cases table

-- Add new columns to cases table
ALTER TABLE cases 
ADD COLUMN department_id VARCHAR(36) NULL,
ADD COLUMN client_name VARCHAR(255) NULL,
ADD COLUMN judge_name VARCHAR(255) NULL,
ADD COLUMN opposing_counsel VARCHAR(255) NULL,
ADD COLUMN estimated_value VARCHAR(255) NULL,
ADD COLUMN notes TEXT NULL;

-- Update ENUM values for case_type
ALTER TABLE cases 
MODIFY COLUMN case_type ENUM('civil', 'criminal', 'family', 'corporate', 'employment', 'real_estate', 'intellectual_property', 'tax', 'bankruptcy', 'other') NOT NULL;

-- Update ENUM values for status
ALTER TABLE cases 
MODIFY COLUMN status ENUM('open', 'pending', 'closed', 'archived', 'on_hold') NOT NULL DEFAULT 'open';

-- Update ENUM values for priority
ALTER TABLE cases 
MODIFY COLUMN priority ENUM('high', 'medium', 'low', 'urgent') NOT NULL DEFAULT 'medium';

-- Add foreign key constraint for department_id
ALTER TABLE cases 
ADD CONSTRAINT fk_cases_department 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- Add indexes for new columns
ALTER TABLE cases 
ADD INDEX idx_department_id (department_id),
ADD INDEX idx_client_name (client_name),
ADD INDEX idx_judge_name (judge_name);
