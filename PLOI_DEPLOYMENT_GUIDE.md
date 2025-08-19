# ProLegal NUST - Ploi Deployment Guide

This guide will walk you through deploying your ProLegal NUST application on a Ploi-managed server.

## Prerequisites

- Ploi server with Ubuntu 24.04.1 LTS (✅ You have this)
- Domain name (optional but recommended)
- SSH access to your server
- MySQL database (will be set up on the server)

## Server Information

- **Server IP**: 188.68.39.236
- **OS**: Ubuntu 24.04.1 LTS
- **User**: ploi (default Ploi user)

## Step 1: Prepare Your Local Environment

### 1.1 Update Configuration

Edit the `deploy-ploi.sh` script and update these variables:

```bash
DOMAIN="your-domain.com"  # Replace with your actual domain
DB_PASSWORD="your_secure_password"
DB_NAME="prolegal_db"  # Database name
DB_USER="prolegal_user"  # Database user
PLOI_USER="ploi"  # Change if your Ploi user is different
```

### 1.2 Database Configuration

The application uses MySQL for the database. The deployment script will:
- Create the MySQL database
- Set up the database user
- Configure all necessary tables
- Seed initial data

## Step 2: Run the Deployment Script

```bash
./deploy-ploi.sh
```

This script will:
- Update the system packages
- Install Node.js 18.x
- Install PM2 for process management
- Clone your repository
- Set up the backend and frontend
- Build both applications
- Start the backend with PM2

## Step 3: Configure Ploi Dashboard

### 3.1 Create a New Site

1. Log into your Ploi dashboard
2. Click "Add Site"
3. Enter your domain name
4. Choose "Static Site" as the site type

### 3.2 Configure Site Settings

**Web Directory**: `/home/ploi/apps/prolegal-nust/dist`

**PHP Version**: Not needed (this is a Node.js app)

### 3.3 Configure Nginx Proxy

You need to configure Nginx to proxy API requests to your backend. In the Ploi dashboard:

1. Go to your site settings
2. Click on "Nginx Configuration"
3. Add this configuration:

```nginx
# Frontend (React app)
location / {
    try_files $uri $uri/ /index.html;
}

# Backend API
location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Static files
location /uploads/ {
    alias /home/ploi/apps/prolegal-nust/backend/uploads/;
}
```

### 3.4 Enable SSL (Optional)

If you have a domain:
1. Go to your site settings
2. Click "SSL"
3. Choose "Let's Encrypt"
4. Enter your email
5. Click "Install"

## Step 4: Database Setup

### 4.1 Create MySQL Database

The deployment script will automatically:
1. Create the MySQL database (`prolegal_db`)
2. Create a database user (`prolegal_user`)
3. Grant necessary privileges
4. Run all migrations and seed data

If you prefer to do this manually in Ploi dashboard:
1. Go to "Databases"
2. Click "Add Database"
3. Create a database named `prolegal_db`
4. Create a user with all privileges

### 4.2 Database Migrations

The deployment script will automatically run:
- All SQL migration files
- Seed data scripts
- Contract type initialization
- Sample data creation

## Step 5: Update Environment Variables

### 5.1 Backend Environment

The deployment script will automatically create the backend `.env` file with:

```env
DB_HOST=localhost
DB_USER=prolegal_user
DB_PASSWORD=your_secure_password
DB_NAME=prolegal_db
DB_PORT=3306
PORT=3000
NODE_ENV=production
```

### 5.2 Frontend Environment

The deployment script will automatically create the frontend `.env` file with:

```env
VITE_API_URL=https://your-domain.com/api
```

## Step 6: Restart Services

```bash
# Restart the backend
pm2 restart prolegal-backend

# Rebuild frontend if needed
cd ~/apps/prolegal-nust
npm run build
```

## Step 7: Verify Deployment

1. Visit your domain in a browser
2. Check that the frontend loads correctly
3. Test API endpoints by trying to log in
4. Check PM2 status: `pm2 status`
5. Check logs: `pm2 logs prolegal-backend`

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running: `pm2 status`
   - Check backend logs: `pm2 logs prolegal-backend`
   - Verify port 3000 is not blocked

2. **Database Connection Issues**
   - Verify database credentials in `.env`
   - Check if MySQL is running: `sudo systemctl status mysql`
   - Test connection: `mysql -u your_user -p`

3. **Frontend Not Loading**
   - Check if build was successful
   - Verify web directory in Ploi settings
   - Check Nginx configuration

### Useful Commands

```bash
# View PM2 logs
pm2 logs prolegal-backend

# Restart backend
pm2 restart prolegal-backend

# View PM2 status
pm2 status

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check if port 3000 is listening
netstat -tlnp | grep :3000
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Database**: Use strong passwords and limit database access
3. **Firewall**: Ensure only necessary ports are open
4. **SSL**: Always use HTTPS in production
5. **Updates**: Keep your system and dependencies updated

## Monitoring

### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View detailed status
pm2 show prolegal-backend

# Set up PM2 startup
pm2 startup
pm2 save
```

### Log Monitoring

```bash
# Backend logs
pm2 logs prolegal-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Backup Strategy

1. **Database Backups**: Set up automated MySQL backups
2. **Code Backups**: Your code is in Git, so it's already backed up
3. **Environment Files**: Keep secure copies of your `.env` files
4. **Uploads**: Backup the `/uploads` directory regularly

## Performance Optimization

1. **Enable Gzip**: Configure Nginx to compress responses
2. **Caching**: Set up proper caching headers
3. **CDN**: Consider using a CDN for static assets
4. **Database**: Optimize database queries and indexes

## Support

If you encounter issues:
1. Check the logs first
2. Verify all configuration files
3. Test each component individually
4. Check Ploi documentation for server-specific issues

---

Your ProLegal NUST application should now be successfully deployed on Ploi! 🎉
