import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prolegal_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    console.log('🗄️ Initializing database schema...');
    
    // 1. Users table (core user management)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'attorney', 'paralegal', 'staff') NOT NULL DEFAULT 'staff',
        status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
        phone VARCHAR(50),
        avatar_url VARCHAR(500),
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(500),
        email_verification_expires TIMESTAMP NULL,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_role (role),
        INDEX idx_email_verified (email_verified),
        INDEX idx_last_login (last_login)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. User sessions for authentication
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Departments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        head_user_id VARCHAR(36),
        email VARCHAR(255),
        phone VARCHAR(50),
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (name),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. User department assignments (many-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_departments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        department_id VARCHAR(36) NOT NULL,
        position VARCHAR(255),
        is_primary BOOLEAN DEFAULT FALSE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_dept (user_id, department_id),
        INDEX idx_user_id (user_id),
        INDEX idx_department_id (department_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Cases table (main legal cases)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cases (
        id VARCHAR(36) PRIMARY KEY,
        case_number VARCHAR(255) UNIQUE NOT NULL,
        case_name VARCHAR(500) NOT NULL,
        description TEXT,
        case_type ENUM('civil', 'criminal', 'family', 'corporate', 'employment', 'real_estate', 'intellectual_property', 'tax', 'bankruptcy', 'other') NOT NULL,
        status ENUM('open', 'pending', 'closed', 'archived', 'on_hold') NOT NULL DEFAULT 'open',
        priority ENUM('high', 'medium', 'low', 'urgent') NOT NULL DEFAULT 'medium',
        filing_date DATE,
        court_name VARCHAR(255),
        court_case_number VARCHAR(255),
        estimated_completion_date DATE,
        actual_completion_date DATE,
        department_id VARCHAR(36),
        law_firm_id VARCHAR(36),
        client_name VARCHAR(255),
        judge_name VARCHAR(255),
        opposing_counsel VARCHAR(255),
        estimated_value VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (law_firm_id) REFERENCES law_firms(id) ON DELETE SET NULL,
        INDEX idx_case_number (case_number),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_filing_date (filing_date),
        INDEX idx_case_type (case_type),
        INDEX idx_department_id (department_id),
        INDEX idx_law_firm_id (law_firm_id),
        INDEX idx_client_name (client_name),
        INDEX idx_judge_name (judge_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Case assignments (many-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS case_assignments (
        id VARCHAR(36) PRIMARY KEY,
        case_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('lead_attorney', 'associate_attorney', 'paralegal', 'assistant') NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by VARCHAR(36) NOT NULL,
        
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_case_user (case_id, user_id),
        INDEX idx_case_id (case_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Case updates/activity log
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS case_updates (
        id VARCHAR(36) PRIMARY KEY,
        case_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        update_type ENUM('status_change', 'assignment', 'document_added', 'note', 'court_date', 'other') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_case_id (case_id),
        INDEX idx_user_id (user_id),
        INDEX idx_update_type (update_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Vendors table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_type ENUM('corporation', 'partnership', 'individual', 'government', 'other') NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        vat_number VARCHAR(100),
        tin_number VARCHAR(100),
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        status ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. Contract Types table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_types (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 10. Contracts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id VARCHAR(36) PRIMARY KEY,
        contract_number VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        vendor_id VARCHAR(36),
        vendor_ids JSON,
        contract_type_id VARCHAR(36),
        department_id VARCHAR(36),
        status ENUM('draft', 'active', 'expired', 'terminated', 'renewed') NOT NULL DEFAULT 'draft',
        start_date DATE,
        end_date DATE,
        value DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'USD',
        payment_terms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
        FOREIGN KEY (contract_type_id) REFERENCES contract_types(id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        INDEX idx_contract_number (contract_number),
        INDEX idx_status (status),
        INDEX idx_vendor_id (vendor_id),
        INDEX idx_contract_type_id (contract_type_id),
        INDEX idx_department_id (department_id),
        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 10. Contract assignments
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contract_assignments (
        id VARCHAR(36) PRIMARY KEY,
        contract_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('manager', 'reviewer', 'approver', 'monitor') NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by VARCHAR(36) NOT NULL,
        
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_contract_user (contract_id, user_id),
        INDEX idx_contract_id (contract_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 11. Documents table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        file_url VARCHAR(1000),
        mime_type VARCHAR(100),
        document_type ENUM('contract', 'evidence', 'correspondence', 'court_filing', 'research', 'other') NOT NULL,
        category ENUM('cases', 'contracts', 'title_deeds', 'policies', 'frameworks', 'correspondences', 'board_minutes', 'management_minutes', 'sops', 'governance', 'other') NOT NULL DEFAULT 'other',
        status ENUM('draft', 'final', 'archived', 'deleted') NOT NULL DEFAULT 'draft',
        uploaded_by VARCHAR(36) NOT NULL,
        case_id VARCHAR(36),
        contract_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        INDEX idx_title (title),
        INDEX idx_document_type (document_type),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_case_id (case_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 12. Document versions (for version control)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) NOT NULL,
        version_number INT NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        file_size BIGINT NOT NULL,
        uploaded_by VARCHAR(36) NOT NULL,
        change_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_doc_version (document_id, version_number),
        INDEX idx_document_id (document_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13. Tasks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type ENUM('case_related', 'administrative', 'client_related', 'court_related', 'research', 'other') NOT NULL,
        priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
        due_date DATE,
        completed_date DATE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        assigned_to VARCHAR(36),
        assigned_by VARCHAR(36) NOT NULL,
        case_id VARCHAR(36),
        contract_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_due_date (due_date),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_case_id (case_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13.1. Task comments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_task_id (task_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 14. Scraped legal data
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scraped_data (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content LONGTEXT,
        source_type ENUM('case_law', 'legislation', 'regulation', 'gazette', 'news', 'other') NOT NULL,
        source_url VARCHAR(1000) NOT NULL,
        source_name VARCHAR(255),
        date_published DATE,
        reference_number VARCHAR(255),
        jurisdiction VARCHAR(255),
        keywords TEXT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_title (title),
        INDEX idx_source_type (source_type),
        INDEX idx_date_published (date_published),
        INDEX idx_jurisdiction (jurisdiction),
        INDEX idx_scraped_at (scraped_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 15. Scraping sources configuration
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scraping_sources (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(1000) NOT NULL,
        source_type ENUM('case_law', 'legislation', 'regulation', 'gazette', 'news', 'other') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        selectors JSON,
        last_scraped TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_source_type (source_type),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 16. Audit log for system activities
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(100),
        record_id VARCHAR(36),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_table_name (table_name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 17. Compliance surveys
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_surveys (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department_id VARCHAR(36),
        due_date DATE,
        status ENUM('draft', 'active', 'completed', 'expired') NOT NULL DEFAULT 'draft',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_department_id (department_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 18. Compliance runs (new table for compliance campaigns)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_runs (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        frequency ENUM('once', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'annually') NOT NULL DEFAULT 'once',
        start_date DATE NOT NULL,
        due_date DATE NOT NULL,
        recurring_day INT NULL,
        is_recurring BOOLEAN DEFAULT FALSE,
        last_run_date DATE NULL,
        next_run_date DATE NULL,
        status ENUM('draft', 'active', 'completed', 'expired', 'paused') NOT NULL DEFAULT 'draft',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_start_date (start_date),
        INDEX idx_next_run_date (next_run_date),
        INDEX idx_is_recurring (is_recurring)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 19. Compliance run departments (many-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_run_departments (
        id VARCHAR(36) PRIMARY KEY,
        compliance_run_id VARCHAR(36) NOT NULL,
        department_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (compliance_run_id) REFERENCES compliance_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_run_dept (compliance_run_id, department_id),
        INDEX idx_compliance_run_id (compliance_run_id),
        INDEX idx_department_id (department_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 20. Compliance questions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_questions (
        id VARCHAR(36) PRIMARY KEY,
        compliance_run_id VARCHAR(36) NOT NULL,
        question_text TEXT NOT NULL,
        question_type ENUM('yesno', 'score', 'multiple', 'text') NOT NULL,
        is_required BOOLEAN DEFAULT TRUE,
        options JSON,
        max_score INT DEFAULT 10,
        order_index INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (compliance_run_id) REFERENCES compliance_runs(id) ON DELETE CASCADE,
        INDEX idx_compliance_run_id (compliance_run_id),
        INDEX idx_order_index (order_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 21. Compliance recipients (users who need to complete surveys)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_recipients (
        id VARCHAR(36) PRIMARY KEY,
        compliance_run_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        department_id VARCHAR(36) NOT NULL,
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_at TIMESTAMP NULL,
        survey_completed BOOLEAN DEFAULT FALSE,
        survey_completed_at TIMESTAMP NULL,
        survey_link_token VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (compliance_run_id) REFERENCES compliance_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_run_user (compliance_run_id, user_id),
        INDEX idx_compliance_run_id (compliance_run_id),
        INDEX idx_user_id (user_id),
        INDEX idx_survey_link_token (survey_link_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 22. Compliance responses
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_responses (
        id VARCHAR(36) PRIMARY KEY,
        compliance_run_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        question_id VARCHAR(36) NOT NULL,
        answer TEXT,
        score INT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (compliance_run_id) REFERENCES compliance_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES compliance_questions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_question (user_id, question_id, compliance_run_id),
        INDEX idx_compliance_run_id (compliance_run_id),
        INDEX idx_user_id (user_id),
        INDEX idx_question_id (question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 23. Timesheet entries
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS timesheet_entries (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        entry_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        category ENUM('Case Work', 'Client Meeting', 'Court Appearance', 'Research', 'Administrative', 'Other') NOT NULL,
        case_id VARCHAR(36) NULL,
        contract_id VARCHAR(36) NULL,
        hours DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        INDEX idx_user_date (user_id, entry_date),
        INDEX idx_entry_date (entry_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 24. Law firms table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS law_firms (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        firm_type ENUM('in_house', 'external') NOT NULL DEFAULT 'external',
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        specializations TEXT,
        bar_number VARCHAR(100),
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_firm_type (firm_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    console.log('✅ Database schema initialized successfully');
    console.log('📊 Created 24 tables with proper relationships');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Helper function to generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
