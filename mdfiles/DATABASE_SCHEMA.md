# ProLegal Database Schema Documentation

## 🗄️ Database Overview

The ProLegal application uses a comprehensive MySQL database with 17 tables designed for legal case management, vendor management, document handling, and compliance tracking.

## 📊 Table Structure

### **1. Users & Authentication**

#### `users` - Core user management
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'attorney', 'paralegal', 'staff') NOT NULL DEFAULT 'staff',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `user_sessions` - Authentication sessions
```sql
CREATE TABLE user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### **2. Organizational Structure**

#### `departments` - Department management
```sql
CREATE TABLE departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_user_id VARCHAR(36),
    email VARCHAR(255),
    phone VARCHAR(50),
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `user_departments` - Many-to-many user-department relationship
```sql
CREATE TABLE user_departments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    position VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_dept (user_id, department_id)
);
```

### **3. Legal Cases Management**

#### `cases` - Main legal cases
```sql
CREATE TABLE cases (
    id VARCHAR(36) PRIMARY KEY,
    case_number VARCHAR(255) UNIQUE NOT NULL,
    case_name VARCHAR(500) NOT NULL,
    description TEXT,
    case_type ENUM('civil', 'criminal', 'family', 'corporate', 'employment', 'other') NOT NULL,
    status ENUM('open', 'pending', 'closed', 'archived') NOT NULL DEFAULT 'open',
    priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    filing_date DATE,
    court_name VARCHAR(255),
    court_case_number VARCHAR(255),
    estimated_completion_date DATE,
    actual_completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `case_assignments` - Case team assignments
```sql
CREATE TABLE case_assignments (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('lead_attorney', 'associate_attorney', 'paralegal', 'assistant') NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(36) NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_case_user (case_id, user_id)
);
```

#### `case_updates` - Case activity log
```sql
CREATE TABLE case_updates (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    update_type ENUM('status_change', 'assignment', 'document_added', 'note', 'court_date', 'other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### **4. Vendor & Contract Management**

#### `vendors` - Vendor information
```sql
CREATE TABLE vendors (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `contracts` - Contract management
```sql
CREATE TABLE contracts (
    id VARCHAR(36) PRIMARY KEY,
    contract_number VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    vendor_id VARCHAR(36),
    contract_type ENUM('service', 'goods', 'consulting', 'employment', 'lease', 'other') NOT NULL,
    status ENUM('draft', 'active', 'expired', 'terminated', 'renewed') NOT NULL DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);
```

#### `contract_assignments` - Contract team assignments
```sql
CREATE TABLE contract_assignments (
    id VARCHAR(36) PRIMARY KEY,
    contract_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('manager', 'reviewer', 'approver', 'monitor') NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(36) NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contract_user (contract_id, user_id)
);
```

### **5. Document Management**

#### `documents` - Document storage
```sql
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_url VARCHAR(1000),
    mime_type VARCHAR(100),
    document_type ENUM('contract', 'evidence', 'correspondence', 'court_filing', 'research', 'other') NOT NULL,
    status ENUM('draft', 'final', 'archived', 'deleted') NOT NULL DEFAULT 'draft',
    uploaded_by VARCHAR(36) NOT NULL,
    case_id VARCHAR(36),
    contract_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
);
```

#### `document_versions` - Document version control
```sql
CREATE TABLE document_versions (
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
    UNIQUE KEY unique_doc_version (document_id, version_number)
);
```

### **6. Task Management**

#### `tasks` - Task tracking
```sql
CREATE TABLE tasks (
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
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
);
```

### **7. Legal Research & Scraping**

#### `scraped_data` - Legal research data
```sql
CREATE TABLE scraped_data (
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
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `scraping_sources` - Scraping configuration
```sql
CREATE TABLE scraping_sources (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    source_type ENUM('case_law', 'legislation', 'regulation', 'gazette', 'news', 'other') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    selectors JSON,
    last_scraped TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **8. Compliance & Auditing**

#### `audit_log` - System activity tracking
```sql
CREATE TABLE audit_log (
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `compliance_surveys` - Compliance tracking
```sql
CREATE TABLE compliance_surveys (
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
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔗 Key Relationships

### **Primary Relationships:**
1. **Users ↔ Departments** (Many-to-Many via `user_departments`)
2. **Users ↔ Cases** (Many-to-Many via `case_assignments`)
3. **Users ↔ Contracts** (Many-to-Many via `contract_assignments`)
4. **Cases ↔ Documents** (One-to-Many)
5. **Contracts ↔ Documents** (One-to-Many)
6. **Cases ↔ Tasks** (One-to-Many)
7. **Vendors ↔ Contracts** (One-to-Many)
8. **Users ↔ Tasks** (One-to-Many assignments)

### **Audit & Tracking:**
- **Case Updates** - Track all case activities
- **Document Versions** - Version control for documents
- **Audit Log** - System-wide activity tracking
- **User Sessions** - Authentication management

## 📈 Indexes for Performance

### **Primary Indexes:**
- All tables have primary key indexes on `id`
- Unique indexes on business keys (email, case_number, contract_number)
- Foreign key indexes for all relationships

### **Performance Indexes:**
- Status-based queries (users.status, cases.status, etc.)
- Date-based queries (filing_date, due_date, created_at)
- Search indexes (name, title, email)
- Priority and type-based filtering

## 🚀 API Endpoints

### **Available Endpoints:**
- **Users**: `GET/POST/PUT/DELETE /api/users`
- **Departments**: `GET/POST /api/departments`
- **Cases**: `GET/POST/PUT/DELETE /api/cases`
- **Case Assignments**: `GET/POST /api/cases/:id/assignments`
- **Case Updates**: `GET/POST /api/cases/:id/updates`
- **Vendors**: `GET/POST/PUT/DELETE /api/vendors`
- **Contracts**: `GET/POST /api/contracts`
- **Documents**: `GET/POST /api/documents`
- **Tasks**: `GET/POST /api/tasks`

## 🎯 Benefits

✅ **Normalized Design** - Eliminates data redundancy  
✅ **Referential Integrity** - Foreign keys ensure data consistency  
✅ **Scalable** - Supports growth and complex queries  
✅ **Audit Trail** - Complete activity tracking  
✅ **Flexible** - Easy to extend with new features  
✅ **Performance** - Proper indexing for fast queries  
✅ **Security** - Password hashing and session management  
✅ **Compliance** - Built-in audit and compliance features
