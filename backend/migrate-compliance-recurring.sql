-- Migration to add recurring survey fields to compliance_runs table
USE prolegal_db;

-- Add new columns for recurring surveys
ALTER TABLE compliance_runs 
ADD COLUMN recurring_day INT NULL AFTER due_date,
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE AFTER recurring_day,
ADD COLUMN last_run_date DATE NULL AFTER is_recurring,
ADD COLUMN next_run_date DATE NULL AFTER last_run_date;

-- Update status enum to include 'paused'
ALTER TABLE compliance_runs 
MODIFY COLUMN status ENUM('draft', 'active', 'completed', 'expired', 'paused') NOT NULL DEFAULT 'draft';

-- Add indexes for better performance
ALTER TABLE compliance_runs 
ADD INDEX idx_next_run_date (next_run_date),
ADD INDEX idx_is_recurring (is_recurring);

-- Update existing records to set is_recurring based on frequency
UPDATE compliance_runs 
SET is_recurring = CASE 
  WHEN frequency IN ('weekly', 'monthly', 'bimonthly', 'quarterly', 'annually') THEN TRUE 
  ELSE FALSE 
END;

-- Set next_run_date for existing recurring surveys
UPDATE compliance_runs 
SET next_run_date = CASE 
  WHEN frequency = 'monthly' AND recurring_day IS NOT NULL THEN 
    DATE_ADD(DATE_FORMAT(CONCAT(YEAR(CURDATE()), '-', MONTH(CURDATE()), '-', recurring_day), '%Y-%m-%d'), INTERVAL 1 MONTH)
  WHEN frequency = 'quarterly' AND recurring_day IS NOT NULL THEN 
    DATE_ADD(DATE_FORMAT(CONCAT(YEAR(CURDATE()), '-', QUARTER(CURDATE()) * 3, '-', recurring_day), '%Y-%m-%d'), INTERVAL 3 MONTH)
  WHEN frequency = 'annually' AND recurring_day IS NOT NULL THEN 
    DATE_ADD(DATE_FORMAT(CONCAT(YEAR(CURDATE()), '-01-', recurring_day), '%Y-%m-%d'), INTERVAL 1 YEAR)
  ELSE NULL
END
WHERE is_recurring = TRUE AND status = 'active';

SELECT 'Migration completed successfully' as status;
