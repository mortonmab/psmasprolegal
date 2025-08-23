-- Migration: Add compliance reminder system
-- This includes external users, reminder tracking, and email confirmations

-- External users table for people not in the system
CREATE TABLE IF NOT EXISTS external_users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  organization VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_organization (organization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compliance reminder recipients (can be internal users or external users)
CREATE TABLE IF NOT EXISTS compliance_reminder_recipients (
  id VARCHAR(36) PRIMARY KEY,
  compliance_record_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL, -- Internal user (can be NULL for external users)
  external_user_id VARCHAR(36) NULL, -- External user (can be NULL for internal users)
  email VARCHAR(255) NOT NULL, -- Store email for easy access
  name VARCHAR(255) NOT NULL, -- Store name for easy access
  role VARCHAR(100), -- e.g., 'primary', 'secondary', 'cc'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (compliance_record_id) REFERENCES general_compliance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (external_user_id) REFERENCES external_users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_recipient (compliance_record_id, user_id, external_user_id),
  INDEX idx_compliance_record_id (compliance_record_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compliance reminder tracking
CREATE TABLE IF NOT EXISTS compliance_reminders (
  id VARCHAR(36) PRIMARY KEY,
  compliance_record_id VARCHAR(36) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL,
  reminder_type ENUM('two_weeks', 'one_week', 'due_date', 'overdue') NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMP NULL,
  email_sent BOOLEAN DEFAULT FALSE,
  confirmation_token VARCHAR(255) UNIQUE,
  confirmed_at TIMESTAMP NULL,
  confirmed_by VARCHAR(255), -- Name of person who confirmed
  status ENUM('pending', 'sent', 'confirmed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (compliance_record_id) REFERENCES general_compliance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES compliance_reminder_recipients(id) ON DELETE CASCADE,
  
  INDEX idx_compliance_record_id (compliance_record_id),
  INDEX idx_scheduled_date (scheduled_date),
  INDEX idx_status (status),
  INDEX idx_confirmation_token (confirmation_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compliance submission confirmations
CREATE TABLE IF NOT EXISTS compliance_confirmations (
  id VARCHAR(36) PRIMARY KEY,
  compliance_record_id VARCHAR(36) NOT NULL,
  reminder_id VARCHAR(36) NOT NULL,
  confirmed_by VARCHAR(255) NOT NULL, -- Name of person who confirmed
  confirmed_email VARCHAR(255) NOT NULL,
  confirmation_type ENUM('submitted', 'renewed', 'extended', 'completed') NOT NULL,
  notes TEXT,
  confirmation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (compliance_record_id) REFERENCES general_compliance_records(id) ON DELETE CASCADE,
  FOREIGN KEY (reminder_id) REFERENCES compliance_reminders(id) ON DELETE CASCADE,
  
  INDEX idx_compliance_record_id (compliance_record_id),
  INDEX idx_confirmation_date (confirmation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
