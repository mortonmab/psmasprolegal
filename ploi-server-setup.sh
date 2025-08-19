#!/bin/bash

# ProLegal NUST - Ploi Server Setup Script
# Run this script directly on your Ploi server

set -e

echo "🚀 Setting up ProLegal NUST on Ploi server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as ploi user
if [ "$USER" != "ploi" ]; then
    echo -e "${RED}This script should be run as the ploi user${NC}"
    exit 1
fi

# Step 1: Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js
echo "🔧 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Step 3: Install MySQL
echo "🗄️ Installing MySQL..."
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# Step 4: Install PM2
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# Step 5: Create application directory
echo "📁 Creating application directory..."
mkdir -p ~/apps/prolegal-nust
cd ~/apps/prolegal-nust

# Step 6: Clone repository
echo "📥 Cloning repository..."
rm -rf * .git
git clone https://github.com/mortonmab/psmasprolegal.git .

# Step 7: Setup backend
echo "⚙️ Setting up backend..."
cd backend
npm install

# Step 8: Setup frontend
echo "🎨 Setting up frontend..."
cd ..
npm install

# Step 9: Build applications
echo "🔨 Building applications..."
npm run build
cd backend
npx tsc
cd ..

# Step 10: Create PM2 ecosystem file
echo "📝 Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'prolegal-backend',
    script: './backend/dist/server.js',
    cwd: '/home/ploi/apps/prolegal-nust',
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

echo -e "${GREEN}✅ Server setup completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create environment files (.env) with your database credentials"
echo "2. Set up MySQL database and run migrations"
echo "3. Configure Ploi dashboard site"
echo "4. Start the application with: pm2 start ecosystem.config.js"
echo ""
echo -e "${GREEN}🎉 Server is ready for ProLegal NUST deployment!${NC}"
