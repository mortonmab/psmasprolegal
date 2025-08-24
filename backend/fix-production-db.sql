-- Fix production database schema issues

-- 1. Add missing columns to compliance_runs table
ALTER TABLE compliance_runs 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_day INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_run_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_run_date DATE DEFAULT NULL;

-- 2. Create calendar_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type ENUM('court_date', 'deadline', 'meeting', 'client_meeting', 'internal_meeting', 'other') NOT NULL DEFAULT 'other',
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  location VARCHAR(500),
  organizer_id VARCHAR(36),
  case_id VARCHAR(36),
  contract_id VARCHAR(36),
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_start_date (start_date),
  INDEX idx_event_type (event_type),
  INDEX idx_organizer_id (organizer_id),
  INDEX idx_case_id (case_id),
  INDEX idx_contract_id (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create calendar_event_attendees table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_event_attendees (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('organizer', 'attendee', 'required', 'optional') NOT NULL DEFAULT 'attendee',
  status ENUM('pending', 'accepted', 'declined', 'tentative') NOT NULL DEFAULT 'pending',
  response_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_event_user (event_id, user_id),
  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Update existing departments with head names (if not already done)
UPDATE departments SET description = 'John Smith' WHERE name = 'IT Department' AND (description IS NULL OR description = '');
UPDATE departments SET description = 'Sarah Johnson' WHERE name = 'Legal Department' AND (description IS NULL OR description = '');
UPDATE departments SET description = 'Michael Brown' WHERE name = 'Managed Care Department' AND (description IS NULL OR description = '');
UPDATE departments SET description = 'Lisa Davis' WHERE name = 'wefdwe' AND (description IS NULL OR description = '');

-- 5. Add any other missing columns that might be needed
ALTER TABLE compliance_runs 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(36),
ADD COLUMN IF NOT EXISTS status ENUM('draft', 'active', 'completed', 'expired') DEFAULT 'draft';

-- Add foreign key if it doesn't exist
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'compliance_runs'
  AND CONSTRAINT_NAME = 'fk_compliance_runs_created_by'
);

SET @sql = IF(@constraint_exists = 0,
  'ALTER TABLE compliance_runs ADD CONSTRAINT fk_compliance_runs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT "Foreign key already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
