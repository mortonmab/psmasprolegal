"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'soxfort.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'no_reply@soxfort.com',
        pass: process.env.SMTP_PASS || '@Soxfort2000'
    }
};
// JWT secret for verification tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Create transporter
const transporter = nodemailer_1.default.createTransport(emailConfig);
class EmailService {
    /**
     * Generate a verification token for email verification
     */
    static generateVerificationToken(userId, email) {
        return jsonwebtoken_1.default.sign({
            userId,
            email,
            type: 'email_verification',
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }, JWT_SECRET);
    }
    /**
     * Generate a password reset token
     */
    static generatePasswordResetToken(userId, email) {
        return jsonwebtoken_1.default.sign({
            userId,
            email,
            type: 'password_reset',
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        }, JWT_SECRET);
    }
    /**
     * Verify a JWT token
     */
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * Send email verification email
     */
    static async sendVerificationEmail(data, baseUrl) {
        const token = this.generateVerificationToken(data.userId, data.email);
        const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
        const mailOptions = {
            from: `"ProLegal System" <${emailConfig.auth.user}>`,
            to: data.email,
            subject: 'Welcome to ProLegal - Verify Your Email',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">ProLegal</h1>
            <p style="margin: 10px 0 0 0;">Legal Case Management System</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, ${data.fullName}!</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining ProLegal. To complete your account setup and start using our legal case management system, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 6px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This verification link will expire in 24 hours. If you didn't create an account with ProLegal, 
                you can safely ignore this email.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2024 ProLegal. All rights reserved.
            </p>
          </div>
        </div>
      `
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Verification email sent to ${data.email}`);
        }
        catch (error) {
            console.error('❌ Error sending verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }
    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail(data, baseUrl) {
        const token = this.generatePasswordResetToken(data.userId, data.email);
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;
        const mailOptions = {
            from: `"ProLegal System" <${emailConfig.auth.user}>`,
            to: data.email,
            subject: 'ProLegal - Password Reset Request',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">ProLegal</h1>
            <p style="margin: 10px 0 0 0;">Legal Case Management System</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Hello ${data.fullName}, we received a request to reset your password for your ProLegal account. 
              Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This password reset link will expire in 1 hour. If you didn't request a password reset, 
                you can safely ignore this email.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2024 ProLegal. All rights reserved.
            </p>
          </div>
        </div>
      `
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${data.email}`);
        }
        catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }
    /**
     * Hash password using bcrypt-like approach (using crypto)
     */
    static hashPassword(password) {
        // In production, use bcrypt or argon2
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    /**
     * Verify password
     */
    static verifyPassword(password, hashedPassword) {
        const [salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto_1.default.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }
    /**
     * Send task assignment email
     */
    static async sendTaskAssignmentEmail(data) {
        try {
            const priorityColor = data.priority === 'high' ? '#dc2626' : data.priority === 'medium' ? '#d97706' : '#059669';
            const dueDateText = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'No due date set';
            const mailOptions = {
                from: `"ProLegal System" <${emailConfig.auth.user}>`,
                to: data.assignedToEmail,
                subject: `New Task Assigned: ${data.taskTitle} - ProLegal`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Task Assignment</h2>
            <p>Hello ${data.assignedToName},</p>
            <p>You have been assigned a new task by ${data.assignedByName}.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${data.taskTitle}</h3>
              
              ${data.description ? `<p style="color: #475569; margin: 10px 0;"><strong>Description:</strong> ${data.description}</p>` : ''}
              
              <div style="display: flex; gap: 20px; margin: 15px 0;">
                <div>
                  <span style="font-weight: bold; color: #475569;">Priority:</span>
                  <span style="color: ${priorityColor}; font-weight: bold; margin-left: 5px;">${data.priority.toUpperCase()}</span>
                </div>
                <div>
                  <span style="font-weight: bold; color: #475569;">Due Date:</span>
                  <span style="margin-left: 5px;">${dueDateText}</span>
                </div>
              </div>
            </div>
            
            <p>Please log into your ProLegal account to view the full task details and update the status as needed.</p>
            
            <div style="margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Task
              </a>
            </div>
            
            <p>Best regards,<br>The ProLegal Team</p>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Task assignment email sent to ${data.assignedToEmail}`);
        }
        catch (error) {
            console.error('❌ Error sending task assignment email:', error);
            throw new Error('Failed to send task assignment email');
        }
    }
    static async sendTaskStatusUpdateEmail(data) {
        try {
            const statusColor = data.newStatus === 'completed' ? '#059669' : data.newStatus === 'in_progress' ? '#2563eb' : '#6b7280';
            const dueDateText = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'No due date set';
            const mailOptions = {
                from: `"ProLegal System" <${emailConfig.auth.user}>`,
                to: data.assignedByEmail,
                subject: `Task Status Updated: ${data.taskTitle} - ProLegal`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Task Status Update</h2>
            <p>Hello ${data.assignedByName},</p>
            <p>The status of a task you assigned has been updated by ${data.updatedByName}.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${data.taskTitle}</h3>
              
              <div style="display: flex; gap: 20px; margin: 15px 0;">
                <div>
                  <span style="font-weight: bold; color: #475569;">New Status:</span>
                  <span style="color: ${statusColor}; font-weight: bold; margin-left: 5px;">${data.newStatus.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div>
                  <span style="font-weight: bold; color: #475569;">Due Date:</span>
                  <span style="margin-left: 5px;">${dueDateText}</span>
                </div>
              </div>
            </div>
            
            <p>Click the button below to view the task details and any comments.</p>
            
            <div style="margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks/${data.taskId}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Task
              </a>
            </div>
            
            <p>Best regards,<br>The ProLegal Team</p>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Task status update email sent to ${data.assignedByEmail}`);
        }
        catch (error) {
            console.error('❌ Error sending task status update email:', error);
            throw new Error('Failed to send task status update email');
        }
    }
    static async sendTaskAcceptedEmail(data) {
        try {
            const dueDateText = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'No due date set';
            const mailOptions = {
                from: `"ProLegal System" <${emailConfig.auth.user}>`,
                to: data.assignedByEmail,
                subject: `Task Accepted: ${data.taskTitle} - ProLegal`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Task Accepted</h2>
            <p>Hello ${data.assignedByName},</p>
            <p>Great news! ${data.acceptedByName} has accepted the task you assigned.</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${data.taskTitle}</h3>
              
              <div style="margin: 15px 0;">
                <span style="font-weight: bold; color: #475569;">Status:</span>
                <span style="color: #059669; font-weight: bold; margin-left: 5px;">IN PROGRESS</span>
              </div>
              
              <div style="margin: 15px 0;">
                <span style="font-weight: bold; color: #475569;">Due Date:</span>
                <span style="margin-left: 5px;">${dueDateText}</span>
              </div>
            </div>
            
            <p>The task is now in progress. You'll receive updates when the status changes or when comments are added.</p>
            
            <div style="margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks/${data.taskId}" 
                 style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Task
              </a>
            </div>
            
            <p>Best regards,<br>The ProLegal Team</p>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Task accepted email sent to ${data.assignedByEmail}`);
        }
        catch (error) {
            console.error('❌ Error sending task accepted email:', error);
            throw new Error('Failed to send task accepted email');
        }
    }
    static async sendTaskCommentEmail(data) {
        try {
            const mailOptions = {
                from: `"ProLegal System" <${emailConfig.auth.user}>`,
                to: data.assignedByEmail,
                subject: `New Comment on Task: ${data.taskTitle} - ProLegal`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Task Comment</h2>
            <p>Hello ${data.assignedByName},</p>
            <p>${data.commentedByName} has added a new comment to a task you assigned.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${data.taskTitle}</h3>
              
              <div style="margin: 15px 0;">
                <span style="font-weight: bold; color: #475569;">Comment by:</span>
                <span style="margin-left: 5px;">${data.commentedByName}</span>
              </div>
            </div>
            
            <p>Click the button below to view the task and read the comment.</p>
            
            <div style="margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks/${data.taskId}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Task & Comments
              </a>
            </div>
            
            <p>Best regards,<br>The ProLegal Team</p>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Task comment email sent to ${data.assignedByEmail}`);
        }
        catch (error) {
            console.error('❌ Error sending task comment email:', error);
            throw new Error('Failed to send task comment email');
        }
    }
    static async sendContractExpiryNotification(data, recipientEmail, recipientName, notificationType) {
        try {
            const getSubject = () => {
                switch (notificationType) {
                    case 'reminder':
                        return `Contract Expiry Reminder: ${data.contractTitle} - ${data.daysUntilExpiry} days remaining`;
                    case 'urgent':
                        return `URGENT: Contract Expiring Soon - ${data.contractTitle} - ${data.daysUntilExpiry} days remaining`;
                    case 'expired':
                        return `CONTRACT EXPIRED: ${data.contractTitle} - Action Required`;
                }
            };
            const getColor = () => {
                switch (notificationType) {
                    case 'reminder':
                        return '#d97706'; // Orange
                    case 'urgent':
                        return '#dc2626'; // Red
                    case 'expired':
                        return '#dc2626'; // Red
                }
            };
            const getMessage = () => {
                switch (notificationType) {
                    case 'reminder':
                        return `This contract will expire in ${data.daysUntilExpiry} days. Please review and take necessary action.`;
                    case 'urgent':
                        return `URGENT: This contract will expire in ${data.daysUntilExpiry} days. Immediate action is required.`;
                    case 'expired':
                        return `This contract has expired today. Immediate action is required to prevent any legal or operational issues.`;
                }
            };
            const mailOptions = {
                from: `"ProLegal System" <${emailConfig.auth.user}>`,
                to: recipientEmail,
                subject: getSubject(),
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${getColor()}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">ProLegal</h1>
              <p style="margin: 10px 0 0 0;">Contract Expiry Notification</p>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Contract Expiry Alert</h2>
              
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                Hello ${recipientName},
              </p>
              
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                ${getMessage()}
              </p>
              
              <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Contract Details</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Contract Title:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.contractTitle}</p>
                  </div>
                  
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Contract Number:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.contractNumber}</p>
                  </div>
                  
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Department:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.departmentName}</p>
                  </div>
                  
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Contract Type:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.contractType}</p>
                  </div>
                  
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">End Date:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${new Date(data.endDate).toLocaleDateString()}</p>
                  </div>
                  
                  ${data.contractValue ? `
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Contract Value:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.currency || 'USD'} ${data.contractValue}</p>
                  </div>
                  ` : ''}
                </div>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <span style="font-weight: bold; color: #6b7280;">Days Until Expiry:</span>
                  <span style="color: ${getColor()}; font-weight: bold; font-size: 18px; margin-left: 10px;">
                    ${data.daysUntilExpiry} ${data.daysUntilExpiry === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/contracts/${data.contractId}" 
                   style="background-color: ${getColor()}; color: white; padding: 12px 30px; text-decoration: none; 
                          border-radius: 6px; display: inline-block; font-weight: bold;">
                  View Contract Details
                </a>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">Required Actions:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                  <li>Review the contract terms and conditions</li>
                  <li>Assess if renewal is required</li>
                  <li>Contact relevant parties if renegotiation is needed</li>
                  <li>Update contract status in the system</li>
                  <li>Ensure compliance with any termination clauses</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from the ProLegal system. Please take appropriate action to ensure 
                contract compliance and avoid any legal or operational issues.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2024 ProLegal. All rights reserved.
              </p>
            </div>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Contract expiry notification sent to ${recipientEmail} for contract ${data.contractId}`);
        }
        catch (error) {
            console.error('❌ Error sending contract expiry notification:', error);
            throw new Error('Failed to send contract expiry notification');
        }
    }
    /**
     * Send event invitation email
     */
    static async sendEventInvitation(data) {
        try {
            const recipientEmail = data.attendeeEmail;
            const recipientName = data.attendeeName;
            const getEventTypeColor = () => {
                switch (data.eventType) {
                    case 'court_date': return '#dc2626';
                    case 'deadline': return '#d97706';
                    case 'meeting': return '#059669';
                    case 'client_meeting': return '#2563eb';
                    case 'internal_meeting': return '#7c3aed';
                    default: return '#6b7280';
                }
            };
            const getEventTypeLabel = () => {
                return data.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            };
            const mailOptions = {
                from: `"ProLegal Calendar" <${emailConfig.auth.user}>`,
                to: recipientEmail,
                subject: `📅 Event Invitation: ${data.eventTitle}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">📅 ProLegal Calendar</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Event Invitation</p>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">You're Invited!</h2>
              
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                Hello ${recipientName},
              </p>
              
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                You have been invited to attend an event by <strong>${data.organizerName}</strong>.
              </p>
              
              <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="background-color: ${getEventTypeColor()}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ${getEventTypeLabel()}
                  </span>
                  <span style="margin-left: auto; color: #6b7280; font-size: 14px;">Role: ${data.role}</span>
                </div>
                
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">${data.eventTitle}</h3>
                
                ${data.eventDescription ? `
                <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">
                  ${data.eventDescription}
                </p>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Date:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${new Date(data.startDate).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <span style="font-weight: bold; color: #6b7280;">Time:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.startTime} - ${data.endTime}</p>
                  </div>
                  
                  ${data.location ? `
                  <div style="grid-column: 1 / -1;">
                    <span style="font-weight: bold; color: #6b7280;">Location:</span>
                    <p style="margin: 5px 0; color: #1f2937;">${data.location}</p>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; 
                          border-radius: 6px; display: inline-block; font-weight: bold; margin: 0 10px;">
                  View in Calendar
                </a>
              </div>
              
              <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #0c4a6e;">Event Details:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
                  <li>Please respond to this invitation</li>
                  <li>Add the event to your calendar</li>
                  <li>Contact the organizer if you have questions</li>
                  <li>Prepare any required materials</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This invitation was sent from the ProLegal system. Please respond to confirm your attendance.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2024 ProLegal. All rights reserved.
              </p>
            </div>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Event invitation sent to ${recipientEmail} for event ${data.eventId}`);
        }
        catch (error) {
            console.error('❌ Error sending event invitation:', error);
            // Don't throw error, just log it to prevent blocking the response
            console.log('Continuing despite email error...');
        }
    }
    /**
     * Send compliance survey notification email
     */
    static async sendComplianceSurveyNotification(data) {
        try {
            const mailOptions = {
                from: emailConfig.auth.user,
                to: data.recipientEmail,
                subject: `Compliance Survey Required: ${data.complianceRunTitle}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Compliance Survey Required</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">${data.complianceRunTitle}</h2>
              
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 15px 0; color: #666;">${data.complianceRunDescription}</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                  <div>
                    <strong style="color: #333;">Department:</strong><br>
                    ${data.departmentName}
                  </div>
                  <div>
                    <strong style="color: #333;">Due Date:</strong><br>
                    ${data.dueDate}
                  </div>
                </div>
              </div>
              
              <p style="color: #666; margin-bottom: 20px;">
                Dear <strong>${data.recipientName}</strong>,<br><br>
                You have been selected to complete a compliance survey as part of our ongoing compliance monitoring program. 
                This survey has been created by <strong>${data.createdByName}</strong> and must be completed by the due date.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.surveyLink}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                  Complete Survey Now
                </a>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">Important Information:</h3>
                <ul style="color: #666; margin: 0; padding-left: 20px;">
                  <li>This survey is mandatory and must be completed by the due date</li>
                  <li>The survey will take approximately 5-10 minutes to complete</li>
                  <li>Your responses will be kept confidential and used for compliance purposes only</li>
                  <li>If you have any questions, please contact the legal department</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                <p>If you have any technical issues or questions about this survey, please contact the legal department.</p>
                <p>Thank you for your cooperation in maintaining our compliance standards.</p>
              </div>
            </div>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Compliance survey notification sent to ${data.recipientEmail} for run ${data.complianceRunId}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending compliance survey notification:', error);
            return false;
        }
    }
    /**
     * Send compliance reminder email
     */
    static async sendComplianceReminder(data) {
        try {
            const reminderTypeText = {
                'two_weeks': '2 weeks before due date',
                'one_week': '1 week before due date',
                'due_date': 'Due today',
                'overdue': 'Overdue'
            };
            const urgencyColor = data.reminderType === 'due_date' || data.reminderType === 'overdue' ? '#dc2626' : '#f59e0b';
            const urgencyText = data.reminderType === 'due_date' || data.reminderType === 'overdue' ? 'URGENT' : 'REMINDER';
            const mailOptions = {
                from: `"ProLegal Compliance" <${emailConfig.auth.user}>`,
                to: data.recipientEmail,
                subject: `Compliance ${urgencyText}: ${data.complianceName} - ${reminderTypeText[data.reminderType]}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Compliance ${urgencyText}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${reminderTypeText[data.reminderType]}</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">${data.complianceName}</h2>
              
              <div style="background: #fef2f2; border-left: 4px solid ${urgencyColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 15px 0; color: #666;">${data.complianceDescription}</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                  <div>
                    <strong style="color: #333;">Due Date:</strong><br>
                    ${data.dueDate}
                  </div>
                  <div>
                    <strong style="color: #333;">Frequency:</strong><br>
                    ${data.frequency.charAt(0).toUpperCase() + data.frequency.slice(1)}
                  </div>
                </div>
              </div>
              
              <p style="color: #666; margin-bottom: 20px;">
                Dear <strong>${data.recipientName}</strong>,<br><br>
                This is a reminder that the compliance item above requires your attention. 
                Please ensure this is completed by the due date to maintain compliance standards.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.confirmationLink}" style="display: inline-block; background: ${urgencyColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);">
                  Confirm Completion
                </a>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">Action Required:</h3>
                <ul style="color: #666; margin: 0; padding-left: 20px;">
                  <li>Review the compliance requirement</li>
                  <li>Complete the necessary actions</li>
                  <li>Click the "Confirm Completion" button above</li>
                  <li>Select the appropriate confirmation type (submitted, renewed, extended, or completed)</li>
                  <li>Add any relevant notes if needed</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                <p><strong>Note:</strong> Once you confirm completion, you will no longer receive reminder emails for this item.</p>
                <p>If you have any questions or need assistance, please contact the legal department.</p>
              </div>
            </div>
          </div>
        `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Compliance reminder sent to ${data.recipientEmail} for ${data.complianceName}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending compliance reminder:', error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
