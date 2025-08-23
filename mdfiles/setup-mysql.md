# MySQL Migration Setup Guide

## Prerequisites

1. **Install MySQL Server** (if not already installed):
   ```bash
   # On macOS with Homebrew
   brew install mysql
   
   # On Ubuntu/Debian
   sudo apt update
   sudo apt install mysql-server
   
   # On Windows
   # Download and install from https://dev.mysql.com/downloads/mysql/
   ```

2. **Start MySQL Service**:
   ```bash
   # On macOS
   brew services start mysql
   
   # On Ubuntu/Debian
   sudo systemctl start mysql
   sudo systemctl enable mysql
   ```

3. **Secure MySQL Installation**:
   ```bash
   sudo mysql_secure_installation
   ```

## Database Setup

1. **Create Database**:
   ```sql
   mysql -u root -p
   CREATE DATABASE prolegal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Create Environment File**:
   Create `backend/.env` with the following content:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=prolegal_db
   DB_PORT=3306
   
   # Server Configuration
   PORT=3000
   
   # Environment
   NODE_ENV=development
   ```

## Installation Steps

1. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Start the Backend Server**:
   ```bash
   npm run dev
   ```

3. **Verify Database Connection**:
   The server will automatically:
   - Test the database connection
   - Create all necessary tables
   - Start the API server

## API Endpoints

The backend now provides the following REST API endpoints:

### Users
- `GET /api/users` - Get all active users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user (set status to inactive)

### Cases
- `GET /api/cases` - Get all cases
- `GET /api/cases/:id` - Get case by ID
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Vendors
- `GET /api/vendors` - Get all vendors
- `GET /api/vendors/:id` - Get vendor by ID
- `POST /api/vendors` - Create new vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Soft delete vendor (set status to inactive)

## Migration Benefits

1. **Local Development**: Easy to set up and run locally
2. **Cloud Migration**: Simple to migrate to cloud MySQL services (AWS RDS, Google Cloud SQL, etc.)
3. **Data Integrity**: ACID compliance and foreign key constraints
4. **Performance**: Optimized queries with proper indexing
5. **Backup & Recovery**: Standard MySQL backup tools
6. **Monitoring**: Rich ecosystem of monitoring tools

## Cloud Deployment

When ready to deploy to your cloud server:

1. **Update Environment Variables**:
   ```env
   DB_HOST=your-cloud-mysql-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=prolegal_db
   DB_PORT=3306
   ```

2. **Database Migration**:
   - Export your local database: `mysqldump -u root -p prolegal_db > backup.sql`
   - Import to cloud: `mysql -h your-host -u user -p prolegal_db < backup.sql`

3. **Deploy Backend**:
   - Upload backend code to your server
   - Install dependencies: `npm install --production`
   - Start server: `npm start`
