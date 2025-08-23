# 📧 Email Verification Setup Guide

## 🎯 **Overview**

The ProLegal system now includes email verification and password reset functionality. When a new user is created, they will receive an email with a verification link to set their password and verify their email address.

## ⚙️ **Configuration Required**

### **1. Environment Variables**

Add the following variables to your `backend/.env` file:

```env
# JWT Secret (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **2. Email Provider Setup**

#### **For Gmail:**
1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate a new app password for "Mail"
4. Use this app password as `SMTP_PASS`

#### **For Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### **For Custom SMTP Server:**
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
```

## 🔄 **How It Works**

### **1. User Creation Flow:**
1. Admin creates a new user through the Settings → Users page
2. System sends a verification email to the new user
3. User clicks the verification link in their email
4. User is taken to the verification page to set their password
5. User's email is verified and they can now log in

### **2. Password Reset Flow:**
1. User clicks "Forgot Password?" on the login page
2. User enters their email address
3. System sends a password reset email
4. User clicks the reset link in their email
5. User sets a new password

## 📧 **Email Templates**

The system includes professionally designed email templates:

### **Verification Email:**
- Welcome message with ProLegal branding
- Clear call-to-action button
- 24-hour expiration notice
- Fallback link if button doesn't work

### **Password Reset Email:**
- Security-focused messaging
- 1-hour expiration notice
- Clear instructions for password reset

## 🔒 **Security Features**

### **JWT Tokens:**
- **Email Verification:** 24-hour expiration
- **Password Reset:** 1-hour expiration
- Secure token generation and validation
- Token type validation to prevent misuse

### **Password Security:**
- Minimum 8 characters required
- Secure password hashing using PBKDF2
- Salt generation for each password
- Password confirmation validation

### **Database Security:**
- Email verification status tracking
- Token expiration timestamps
- Secure user status management

## 🧪 **Testing the System**

### **1. Test User Creation:**
```bash
# Create a test user via API
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password_hash": "temp123",
    "full_name": "Test User",
    "role": "staff"
  }'
```

### **2. Check Email Delivery:**
- Monitor your email inbox for the verification email
- Check the backend console for email sending logs
- Verify the email link works correctly

### **3. Test Password Reset:**
```bash
# Request password reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 🚀 **Production Deployment**

### **1. Environment Variables:**
- Use a strong, unique JWT secret
- Configure production SMTP settings
- Set correct frontend URL for production

### **2. Email Provider:**
- Consider using a transactional email service (SendGrid, Mailgun, etc.)
- Set up proper SPF/DKIM records
- Monitor email delivery rates

### **3. Security:**
- Use HTTPS in production
- Implement rate limiting for email endpoints
- Monitor for suspicious activity

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Email Not Sending:**
- Check SMTP credentials
- Verify email provider settings
- Check firewall/network restrictions
- Review backend console logs

#### **Verification Links Not Working:**
- Ensure `FRONTEND_URL` is correct
- Check token expiration
- Verify frontend routes are configured

#### **Password Reset Issues:**
- Confirm user email exists in database
- Check token validity and expiration
- Verify password requirements

### **Debug Commands:**
```bash
# Check email configuration
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check user verification status
mysql -u root -e "SELECT email, email_verified FROM prolegal_db.users WHERE email = 'test@example.com';"
```

## 📋 **API Endpoints**

### **Email Verification:**
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/set-password` - Set password with verification token

### **Password Reset:**
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### **User Management:**
- `POST /api/users` - Create user (sends verification email)
- `GET /api/users` - List users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

## 🎉 **Benefits**

### **Security:**
- ✅ Email verification prevents fake accounts
- ✅ Secure password reset process
- ✅ JWT-based token security
- ✅ Time-limited verification links

### **User Experience:**
- ✅ Professional email templates
- ✅ Clear instructions and guidance
- ✅ Mobile-friendly email design
- ✅ Seamless verification flow

### **Administration:**
- ✅ Easy user onboarding
- ✅ Automated email notifications
- ✅ Password security enforcement
- ✅ User status tracking

## 🚀 **Next Steps**

1. **Configure your email settings** in `backend/.env`
2. **Test the system** with a sample user
3. **Deploy to production** with proper security settings
4. **Monitor email delivery** and user engagement
5. **Consider additional features** like email templates customization

The email verification system is now fully integrated and ready to use! 🎯
