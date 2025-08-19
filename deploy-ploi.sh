#!/bin/bash

# ProLegal NUST Deployment Script for Ploi Server
# This script automates the deployment process on Ploi-managed servers

set -e

echo "🚀 Starting ProLegal NUST deployment on Ploi..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Update these values
SERVER_IP="188.68.39.236"
DOMAIN="your-domain.com"  # Replace with your actual domain
DB_PASSWORD="your_secure_password"
DB_NAME="prolegal_db"
DB_USER="prolegal_user"
PLOI_USER="ploi"  # Default Ploi user, change if different

echo -e "${YELLOW}Please update the configuration variables at the top of this script:${NC}"
echo "- DOMAIN: Your domain name"
echo "- DB_PASSWORD: Secure password for MySQL"
echo "- DB_NAME: Database name (default: prolegal_db)"
echo "- DB_USER: Database user (default: prolegal_user)"
echo "- PLOI_USER: Your Ploi user (default: ploi)"
echo ""

read -p "Have you updated the configuration? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please update the configuration and run the script again.${NC}"
    exit 1
fi

echo -e "${GREEN}Configuration confirmed. Starting deployment...${NC}"

# Step 1: Update system
echo "📦 Updating system packages..."
ssh $PLOI_USER@$SERVER_IP "sudo apt update && sudo apt upgrade -y"

# Step 2: Install Node.js (if not already installed)
echo "🔧 Installing Node.js..."
ssh $PLOI_USER@$SERVER_IP "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
ssh $PLOI_USER@$SERVER_IP "sudo apt-get install -y nodejs"

# Step 3: Install MySQL
echo "🗄️ Installing MySQL..."
ssh $PLOI_USER@$SERVER_IP "sudo apt install mysql-server -y"
ssh $PLOI_USER@$SERVER_IP "sudo systemctl start mysql"
ssh $PLOI_USER@$SERVER_IP "sudo systemctl enable mysql"

# Step 4: Install PM2 globally
echo "⚙️ Installing PM2..."
ssh $PLOI_USER@$SERVER_IP "sudo npm install -g pm2"

# Step 5: Create application directory
echo "📁 Creating application directory..."
ssh $PLOI_USER@$SERVER_IP "mkdir -p ~/apps/prolegal-nust"

# Step 6: Clone repository
echo "📥 Cloning repository..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust && rm -rf * && git clone https://github.com/mortonmab/psmasprolegal.git ."

# Step 7: Setup backend
echo "⚙️ Setting up backend..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && npm install"

# Create backend .env file
cat > backend.env << EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=3306
PORT=3000
NODE_ENV=production
EOF

scp backend.env $PLOI_USER@$SERVER_IP:~/apps/prolegal-nust/backend/.env

# Step 7.5: Setup MySQL Database
echo "🗃️ Setting up MySQL database..."
ssh $PLOI_USER@$SERVER_IP "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
ssh $PLOI_USER@$SERVER_IP "sudo mysql -e \"CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';\""
ssh $PLOI_USER@$SERVER_IP "sudo mysql -e \"GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';\""
ssh $PLOI_USER@$SERVER_IP "sudo mysql -e \"FLUSH PRIVILEGES;\""

# Step 7.6: Run Database Migrations
echo "🗃️ Running database migrations..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrate-cases-table.sql"
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrate-events-table.sql"
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrate-budget-tables.sql"
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < seed-departments.sql"
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && node seed-contract-types.js"
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && node seed-data.js"

# Step 8: Setup frontend
echo "🎨 Setting up frontend..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust && npm install"

# Create frontend .env file
cat > frontend.env << EOF
VITE_API_URL=https://$DOMAIN/api
EOF

scp frontend.env $PLOI_USER@$SERVER_IP:~/apps/prolegal-nust/.env

# Step 9: Build frontend
echo "🔨 Building frontend..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust && npm run build"

# Step 10: Build backend
echo "🔨 Building backend..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust/backend && npx tsc"

# Step 11: Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'prolegal-backend',
    script: './backend/dist/server.js',
    cwd: '/home/$PLOI_USER/apps/prolegal-nust',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

scp ecosystem.config.js $PLOI_USER@$SERVER_IP:~/apps/prolegal-nust/

# Step 12: Start application with PM2
echo "🚀 Starting application with PM2..."
ssh $PLOI_USER@$SERVER_IP "cd ~/apps/prolegal-nust && pm2 start ecosystem.config.js"
ssh $PLOI_USER@$SERVER_IP "pm2 save"
ssh $PLOI_USER@$SERVER_IP "pm2 startup"

# Cleanup
rm -f backend.env frontend.env ecosystem.config.js

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps in Ploi dashboard:${NC}"
echo "1. Create a new site in Ploi dashboard"
echo "2. Set the domain to: $DOMAIN"
echo "3. Set the web directory to: /home/$PLOI_USER/apps/prolegal-nust/dist"
echo "4. Configure the site to proxy /api requests to localhost:3000"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  - View logs: ssh $PLOI_USER@$SERVER_IP 'pm2 logs'"
echo "  - Restart app: ssh $PLOI_USER@$SERVER_IP 'pm2 restart prolegal-backend'"
echo "  - View app status: ssh $PLOI_USER@$SERVER_IP 'pm2 status'"
echo ""
echo -e "${GREEN}🎉 ProLegal NUST is now deployed and ready for Ploi configuration!${NC}"
