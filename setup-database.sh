#!/bin/bash

echo "🚀 Setting up ProLegal MySQL Database"
echo "====================================="

# Check if MySQL is running
if ! mysqladmin ping -h localhost -u root --silent; then
    echo "❌ MySQL is not running. Please start MySQL first:"
    echo "   brew services start mysql  # macOS"
    echo "   sudo systemctl start mysql # Ubuntu/Debian"
    exit 1
fi

echo "✅ MySQL is running"

# Create database
echo "📊 Creating database..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS prolegal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -eq 0 ]; then
    echo "✅ Database 'prolegal_db' created successfully"
else
    echo "❌ Failed to create database. You may need to enter your MySQL password:"
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS prolegal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating .env file..."
    cat > backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=prolegal_db
DB_PORT=3306

# Server Configuration
PORT=3000

# Environment
NODE_ENV=development
EOF
    echo "✅ Created backend/.env file"
    echo "⚠️  Please update the DB_PASSWORD in backend/.env if you have set a MySQL password"
else
    echo "✅ backend/.env file already exists"
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your MySQL password if needed"
echo "2. Start the backend server: cd backend && npm run dev"
echo "3. The server will automatically create all tables on first run"
