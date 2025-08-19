import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool, testConnection, initializeDatabase, generateUUID } from './database';
import { EmailService } from './emailService';
import { ContractExpiryService } from './contractExpiryService';
import { CalendarService } from './calendarService';
import { ComplianceService } from './complianceService';
import jwt from 'jsonwebtoken';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Load environment variables
dotenv.config();

interface ScrapingSource {
  url: string;
  selectors: {
    title: string;
    content: string;
    date?: string;
    reference?: string;
  };
}

interface ScrapeJobStatus {
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  data?: {
    title: string;
    content: string;
    date: string | null;
    reference: string | null;
  };
  error?: string;
}

interface ScrapeRequest {
  source: ScrapingSource;
  searchParams: {
    query?: string;
    dateFrom?: string;
    dateTo?: string;
    court?: string;
    [key: string]: string | undefined;
  };
}

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, and images are allowed.'));
    }
  }
});

// Configure CORS with more permissive settings for development
app.use(cors({
  origin: '*', // For development only - change this in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Error handling middleware for multer
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  if (error) {
    console.error('Upload error:', error);
    return res.status(400).json({ error: error.message || 'File upload failed' });
  }
  next();
});

const PORT = process.env.PORT || 3000;

// Track scraping jobs
const scrapeJobs = new Map<string, ScrapeJobStatus>();

async function scrapeWebsite(source: ScrapingSource, searchParams: ScrapeRequest['searchParams'], jobId: string) {
  try {
    scrapeJobs.set(jobId, { status: 'in_progress', progress: 0 });
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Apply search parameters to URL if needed
    const url = new URL(source.url);
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
    
    await page.goto(url.toString());
    
    // Extract data using selectors
    const data = await page.evaluate((selectors) => {
      const title = document.querySelector(selectors.title)?.textContent?.trim() || '';
      const content = document.querySelector(selectors.content)?.textContent?.trim() || '';
      const date = selectors.date ? document.querySelector(selectors.date)?.textContent?.trim() || null : null;
      const reference = selectors.reference ? document.querySelector(selectors.reference)?.textContent?.trim() || null : null;
      
      return { title, content, date, reference };
    }, source.selectors);
    
    await browser.close();
    
    // Store scraped data in MySQL
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT INTO scraped_data (title, content, date, reference, source_url) VALUES (?, ?, ?, ?, ?)',
        [data.title, data.content, data.date, data.reference, source.url]
      );
    } finally {
      connection.release();
    }

    scrapeJobs.set(jobId, {
      status: 'completed', 
      progress: 100,
      data
    });
  } catch (error) {
    scrapeJobs.set(jobId, {
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { source, searchParams } = req.body as ScrapeRequest;
    
    // Validate request
    if (!source || !source.url || !source.selectors) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid source configuration'
      });
      return;
    }
    
    // Generate a unique job ID
    const jobId = `job-${Date.now()}`;
    
    // Start scraping in background
    scrapeWebsite(source, searchParams, jobId).catch(error => {
      console.error('Background scraping failed:', error);
    });
    
    // Return immediately with job ID
    res.status(202).json({
      status: 'queued',
      jobId
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Job status endpoint
app.get('/api/scrape/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = scrapeJobs.get(jobId);
  
  if (!status) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  res.json(status);
});

// ===== USERS API ENDPOINTS =====
app.get('/api/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, email, full_name, role, status, phone, avatar_url, last_login, created_at, updated_at FROM users WHERE status = ? ORDER BY full_name ASC',
      ['active']
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, email, full_name, role, status, phone, avatar_url, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, password_hash, full_name, role, phone, avatar_url } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const phoneValue = phone || null;
    const avatarUrlValue = avatar_url || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO users (id, email, password_hash, full_name, role, phone, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, full_name, role, phoneValue, avatarUrlValue, 'active']
    );
    
    const [rows] = await connection.execute(
      'SELECT id, email, full_name, role, status, phone, avatar_url, email_verified, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    connection.release();
    
    // Send verification email
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      await EmailService.sendVerificationEmail({
        userId: id,
        email,
        fullName: full_name
      }, baseUrl);
      
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail the user creation if email fails
    }
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Clean up undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    const connection = await pool.getConnection();
    const updateFields = Object.keys(cleanUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(cleanUpdates), id];
    
    await connection.execute(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      values
    );
    
    const [rows] = await connection.execute(
      'SELECT id, email, full_name, role, status, phone, avatar_url, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user password
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Users can only change their own password
    if (id !== userId) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    const connection = await pool.getConnection();

    // Get current user to verify current password
    const [userRows] = await connection.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [id]
    );

    if (!userRows || (userRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = (userRows as any[])[0];

    // Verify current password
    const crypto = require('crypto');
    const currentPasswordHash = crypto.createHash('sha256').update(current_password).digest('hex');
    
    if (user.password_hash !== currentPasswordHash) {
      connection.release();
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = crypto.createHash('sha256').update(new_password).digest('hex');

    // Update password
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, id]
    );

    connection.release();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['inactive', id]
    );
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===== EMAIL VERIFICATION ENDPOINTS =====
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // Verify the token
    const decoded = EmailService.verifyToken(token);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    const connection = await pool.getConnection();
    
    // Check if user exists and token is valid
    const [users] = await connection.execute(
      'SELECT id, email, email_verified FROM users WHERE id = ? AND email = ?',
      [decoded.userId, decoded.email]
    );
    
    if (!users || (users as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = (users as any[])[0];
    
    if (user.email_verified) {
      connection.release();
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Mark email as verified
    await connection.execute(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [decoded.userId]
    );
    
    connection.release();
    
    res.json({ 
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        email_verified: true
      }
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Verify the token
    const decoded = EmailService.verifyToken(token);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    // Hash the new password
    const hashedPassword = EmailService.hashPassword(password);
    
    const connection = await pool.getConnection();
    
    // Update user's password and mark email as verified
    await connection.execute(
      'UPDATE users SET password_hash = ?, email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ? AND email = ?',
      [hashedPassword, decoded.userId, decoded.email]
    );
    
    const [users] = await connection.execute(
      'SELECT id, email, full_name, role, status, email_verified FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    connection.release();
    
    if (!users || (users as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'Password set successfully and email verified',
      user: (users as any[])[0]
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const connection = await pool.getConnection();
    
    // Check if user exists
    const [users] = await connection.execute(
      'SELECT id, email, full_name FROM users WHERE email = ? AND status = ?',
      [email, 'active']
    );
    
    connection.release();
    
    if (!users || (users as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = (users as any[])[0];
    
    // Send password reset email
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      await EmailService.sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        fullName: user.full_name
      }, baseUrl);
      
      res.json({ message: 'Password reset email sent successfully' });
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Error processing forgot password:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Verify the token
    const decoded = EmailService.verifyToken(token);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    // Hash the new password
    const hashedPassword = EmailService.hashPassword(password);
    
    const connection = await pool.getConnection();
    
    // Update user's password
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE id = ? AND email = ?',
      [hashedPassword, decoded.userId, decoded.email]
    );
    
    connection.release();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ===== LOGIN ENDPOINTS =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const connection = await pool.getConnection();
    
    // Find user by email
    const [users] = await connection.execute(
      'SELECT id, email, password_hash, full_name, role, status, email_verified, phone, avatar_url, last_login FROM users WHERE email = ? AND status = ?',
      [email, 'active']
    );
    
    connection.release();
    
    if (!users || (users as any[]).length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = (users as any[])[0];
    
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    // Verify password
    if (!EmailService.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login
    const updateConnection = await pool.getConnection();
    await updateConnection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    updateConnection.release();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    
    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    // In a more complex system, you might want to blacklist the token
    // For now, we'll just return success
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Helper function to get user by ID
const getUserById = async (userId: string) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [userId]
    );
    connection.release();
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Protected route example
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute(
      'SELECT id, email, full_name, role, status, email_verified, phone, avatar_url, last_login, created_at, updated_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    connection.release();
    
    if (!users || (users as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json((users as any[])[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ===== CASES API ENDPOINTS =====
app.get('/api/cases', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(u.full_name, ' (', ca.role, ')') SEPARATOR ', ') as assigned_members
      FROM cases c
      LEFT JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN users u ON ca.user_id = u.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Get cases assigned to a specific user
app.get('/api/cases/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await pool.getConnection();
    
    // Get cases where user is assigned as a collaborator
    const [rows] = await connection.execute(`
      SELECT DISTINCT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(u.full_name, ' (', ca.role, ')') SEPARATOR ', ') as assigned_members
      FROM cases c
      INNER JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE ca.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [userId]);
    
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user cases:', error);
    res.status(500).json({ error: 'Failed to fetch user cases' });
  }
});

app.get('/api/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(u.full_name, ' (', ca.role, ')') SEPARATOR ', ') as assigned_members
      FROM cases c
      LEFT JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const { 
      case_number, 
      case_name, 
      description, 
      case_type, 
      status, 
      priority, 
      filing_date, 
      court_name, 
      court_case_number, 
      estimated_completion_date 
    } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const descriptionValue = description || null;
    const filingDateValue = filing_date || null;
    const courtNameValue = court_name || null;
    const courtCaseNumberValue = court_case_number || null;
    const estimatedCompletionDateValue = estimated_completion_date || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO cases (id, case_number, case_name, description, case_type, status, priority, filing_date, court_name, court_case_number, estimated_completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, case_number, case_name, descriptionValue, case_type, status, priority, filingDateValue, courtNameValue, courtCaseNumberValue, estimatedCompletionDateValue]
    );
    
    const [rows] = await connection.execute(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(u.full_name, ' (', ca.role, ')') SEPARATOR ', ') as assigned_members
      FROM cases c
      LEFT JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

app.put('/api/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Updating case:', id);
    console.log('Update data:', updates);
    
    // Clean up undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    console.log('Clean updates:', cleanUpdates);
    
    const connection = await pool.getConnection();
    const updateFields = Object.keys(cleanUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(cleanUpdates), id];
    
    console.log('SQL:', `UPDATE cases SET ${updateFields} WHERE id = ?`);
    console.log('Values:', values);
    
    await connection.execute(
      `UPDATE cases SET ${updateFields} WHERE id = ?`,
      values
    );
    
    const [rows] = await connection.execute(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(u.full_name, ' (', ca.role, ')') SEPARATOR ', ') as assigned_members
      FROM cases c
      LEFT JOIN case_assignments ca ON c.id = ca.case_id
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating case:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to update case', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM cases WHERE id = ?',
      [id]
    );
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ error: 'Failed to delete case' });
  }
});

// ===== VENDORS API ENDPOINTS =====
app.get('/api/vendors', async (req, res) => {
  try {
    const { search } = req.query;
    const connection = await pool.getConnection();
    
    let query = 'SELECT * FROM vendors WHERE status = "active"';
    let params: any[] = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }
    
    query += ' ORDER BY name ASC';
    
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM vendors WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { 
      name, 
      company_type, 
      address, 
      city, 
      state, 
      country, 
      postal_code,
      vat_number, 
      tin_number, 
      contact_person, 
      email, 
      phone,
      website 
    } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const addressValue = address || null;
    const cityValue = city || null;
    const stateValue = state || null;
    const countryValue = country || null;
    const postalCodeValue = postal_code || null;
    const vatNumberValue = vat_number || null;
    const tinNumberValue = tin_number || null;
    const contactPersonValue = contact_person || null;
    const emailValue = email || null;
    const phoneValue = phone || null;
    const websiteValue = website || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO vendors (id, name, company_type, address, city, state, country, postal_code, vat_number, tin_number, contact_person, email, phone, website, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, company_type, addressValue, cityValue, stateValue, countryValue, postalCodeValue, vatNumberValue, tinNumberValue, contactPersonValue, emailValue, phoneValue, websiteValue, 'active']
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM vendors WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Clean up undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    const connection = await pool.getConnection();
    const updateFields = Object.keys(cleanUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(cleanUpdates), id];
    
    await connection.execute(
      `UPDATE vendors SET ${updateFields} WHERE id = ?`,
      values
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM vendors WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE vendors SET status = ? WHERE id = ?',
      ['inactive', id]
    );
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// ===== DEPARTMENTS API ENDPOINTS =====
app.get('/api/departments', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM departments WHERE status = ? ORDER BY name ASC',
      ['active']
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { name, description, head_user_id, email, phone } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    // Store department head name in description field for now
    const descriptionValue = head_user_id || null;
    const headUserIdValue = null; // We'll handle this differently later
    const emailValue = email || null;
    const phoneValue = phone || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO departments (id, name, description, head_user_id, email, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, descriptionValue, headUserIdValue, emailValue, phoneValue, 'active']
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, head_user_id, email, phone, status } = req.body;
    
    // Convert undefined values to null for MySQL
    // Store department head name in description field for now
    const descriptionValue = head_user_id || null;
    const headUserIdValue = null; // We'll handle this differently later
    const emailValue = email || null;
    const phoneValue = phone || null;
    const statusValue = status || 'active';
    
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE departments SET name = ?, description = ?, head_user_id = ?, email = ?, phone = ?, status = ? WHERE id = ?',
      [name, descriptionValue, headUserIdValue, emailValue, phoneValue, statusValue, id]
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    connection.release();
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to update department', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Soft delete by setting status to inactive
    await connection.execute(
      'UPDATE departments SET status = ? WHERE id = ?',
      ['inactive', id]
    );
    
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ===== CONTRACT TYPES API ENDPOINTS =====
app.get('/api/contract-types', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM contract_types WHERE is_active = ? ORDER BY name ASC',
      [true]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contract types:', error);
    res.status(500).json({ error: 'Failed to fetch contract types' });
  }
});

app.post('/api/contract-types', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const descriptionValue = description || null;
    const colorValue = color || '#3B82F6';
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO contract_types (id, name, description, color, is_active) VALUES (?, ?, ?, ?, ?)',
      [id, name, descriptionValue, colorValue, true]
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM contract_types WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating contract type:', error);
    res.status(500).json({ error: 'Failed to create contract type' });
  }
});

app.put('/api/contract-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, is_active } = req.body;
    
    // Convert undefined values to null for MySQL
    const descriptionValue = description || null;
    const colorValue = color || '#3B82F6';
    const isActiveValue = is_active !== undefined ? is_active : true;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE contract_types SET name = ?, description = ?, color = ?, is_active = ? WHERE id = ?',
      [name, descriptionValue, colorValue, isActiveValue, id]
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM contract_types WHERE id = ?',
      [id]
    );
    connection.release();
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Contract type not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating contract type:', error);
    res.status(500).json({ error: 'Failed to update contract type' });
  }
});

app.delete('/api/contract-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Soft delete by setting is_active to false
    await connection.execute(
      'UPDATE contract_types SET is_active = ? WHERE id = ?',
      [false, id]
    );
    
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contract type:', error);
    res.status(500).json({ error: 'Failed to delete contract type' });
  }
});

// ===== CONTRACTS API ENDPOINTS =====
app.get('/api/contracts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM contracts ORDER BY created_at DESC'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

app.post('/api/contracts', async (req, res) => {
  try {
    const { 
      contract_number, 
      title, 
      description, 
      vendor_id, 
      vendor_ids, 
      contract_type_id, 
      department_id,
      start_date, 
      end_date, 
      value, 
      currency, 
      payment_terms,
      status
    } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const descriptionValue = description || null;
    const vendorIdValue = vendor_id || null;
    const startDateValue = start_date || null;
    const endDateValue = end_date || null;
    const valueValue = value || null;
    const currencyValue = currency || 'USD';
    const paymentTermsValue = payment_terms || null;
    const departmentIdValue = department_id || null;
    const statusValue = status || 'draft';
    
    const connection = await pool.getConnection();
    
    // Insert the main contract
    await connection.execute(
      'INSERT INTO contracts (id, contract_number, title, description, vendor_id, contract_type_id, department_id, start_date, end_date, value, currency, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, contract_number, title, descriptionValue, vendorIdValue, contract_type_id, departmentIdValue, startDateValue, endDateValue, valueValue, currencyValue, paymentTermsValue, statusValue]
    );
    
    // Handle multiple vendors if vendor_ids is provided
    if (vendor_ids && Array.isArray(vendor_ids) && vendor_ids.length > 0) {
      // For now, we'll store the first vendor in vendor_id and the rest in a JSON field
      // In a more sophisticated setup, you might want a separate contract_vendors table
      const vendorIdsJson = JSON.stringify(vendor_ids);
      await connection.execute(
        'UPDATE contracts SET vendor_id = ?, vendor_ids = ? WHERE id = ?',
        [vendor_ids[0], vendorIdsJson, id]
      );
    }
    
    const [rows] = await connection.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating contract:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to create contract', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Contract statistics endpoint
app.get('/api/contracts/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get total contracts
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM contracts');
    const totalContracts = (totalResult as any[])[0].total;
    
    // Get active contracts
    const [activeResult] = await connection.execute('SELECT COUNT(*) as total FROM contracts WHERE status = "active"');
    const activeContracts = (activeResult as any[])[0].total;
    
    // Get contracts expiring in next 30 days
    const [expiringResult] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM contracts 
      WHERE status = 'active' 
      AND end_date IS NOT NULL 
      AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `);
    const expiringSoon = (expiringResult as any[])[0].total;
    
    // Get contracts expiring in next 7 days
    const [expiringWeekResult] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM contracts 
      WHERE status = 'active' 
      AND end_date IS NOT NULL 
      AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    `);
    const expiringThisWeek = (expiringWeekResult as any[])[0].total;
    
    connection.release();
    
    res.json({
      totalContracts,
      activeContracts,
      expiringSoon,
      expiringThisWeek,
      activePercentage: totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching contract statistics:', error);
    res.status(500).json({ error: 'Failed to fetch contract statistics' });
  }
});

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [id]
    );
    connection.release();
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

app.put('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      contract_type_id,
      department_id,
      start_date,
      end_date,
      value,
      currency,
      payment_terms,
      status
    } = req.body;

    const connection = await pool.getConnection();
    
    // Convert undefined values to null for MySQL
    const descriptionValue = description || null;
    const startDateValue = start_date || null;
    const endDateValue = end_date || null;
    const valueValue = value || null;
    const currencyValue = currency || 'USD';
    const paymentTermsValue = payment_terms || null;
    const departmentIdValue = department_id || null;
    const contractTypeIdValue = contract_type_id || null;
    const statusValue = status || 'draft';

    await connection.execute(
      `UPDATE contracts SET 
        title = ?, 
        description = ?, 
        contract_type_id = ?, 
        department_id = ?, 
        start_date = ?, 
        end_date = ?, 
        value = ?, 
        currency = ?, 
        payment_terms = ?, 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title, descriptionValue, contractTypeIdValue, departmentIdValue,
        startDateValue, endDateValue, valueValue, currencyValue,
        paymentTermsValue, statusValue, id
      ]
    );

    // Fetch the updated contract
    const [rows] = await connection.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [id]
    );
    connection.release();

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// ===== TASKS API ENDPOINTS =====
app.get('/api/tasks', async (req, res) => {
  try {
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing
    
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM tasks 
       WHERE assigned_to = ? OR assigned_by = ?
       ORDER BY due_date ASC, priority DESC`,
      [userId, userId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const {
      title,
      description,
      task_type,
      priority,
      status,
      due_date,
      estimated_hours,
      assigned_to,
      assigned_by,
      case_id,
      contract_id
    } = req.body;

    if (!title || !assigned_to || !assigned_by) {
      return res.status(400).json({ error: 'Title, assigned_to, and assigned_by are required' });
    }

    const id = generateUUID();
    const connection = await pool.getConnection();

    // Convert undefined values to null for MySQL
    const dueDateValue = due_date || null;
    const estimatedHoursValue = estimated_hours || null;
    const caseIdValue = case_id || null;
    const contractIdValue = contract_id || null;

    await connection.execute(
      `INSERT INTO tasks (
        id, title, description, task_type, priority, status, 
        due_date, estimated_hours, assigned_to, assigned_by, 
        case_id, contract_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, description || null, task_type, priority, status,
        dueDateValue, estimatedHoursValue, assigned_to, assigned_by,
        caseIdValue, contractIdValue
      ]
    );

    // Fetch the created task
    const [rows] = await connection.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    connection.release();

    // Send email notification to assigned user
    try {
      const assignedUser = await getUserById(assigned_to);
      const assignedByUser = await getUserById(assigned_by);
      
      if (assignedUser && assignedByUser) {
        await EmailService.sendTaskAssignmentEmail({
          taskId: id,
          taskTitle: title,
          assignedToEmail: assignedUser.email,
          assignedToName: assignedUser.full_name,
          assignedByName: assignedByUser.full_name,
          dueDate: due_date,
          priority: priority,
          description: description
        });
        
        console.log(`✅ Task assignment email sent to ${assignedUser.email}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send task assignment email:', emailError);
      // Don't fail the task creation if email fails
    }

    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get single task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing
    
    const connection = await pool.getConnection();
    
    const [rows] = await connection.execute(
      'SELECT * FROM tasks WHERE id = ? AND (assigned_to = ? OR assigned_by = ?)',
      [id, userId, userId]
    );
    connection.release();

    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const connection = await pool.getConnection();

    // First check if user has access to this task
    const [taskRows] = await connection.execute(
      'SELECT id FROM tasks WHERE id = ? AND (assigned_to = ? OR assigned_by = ?)',
      [id, userId, userId]
    );
    
    if (!taskRows || (taskRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Clean up undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === undefined ? null : value])
    );

    const updateFields = Object.keys(cleanUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(cleanUpdates), id];

    await connection.execute(
      `UPDATE tasks SET ${updateFields} WHERE id = ?`,
      values
    );

    // Fetch updated task
    const [rows] = await connection.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    connection.release();

    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Get task comments
app.get('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing
    
    const connection = await pool.getConnection();
    
    // First check if user has access to this task
    const [taskRows] = await connection.execute(
      'SELECT id FROM tasks WHERE id = ? AND (assigned_to = ? OR assigned_by = ?)',
      [id, userId, userId]
    );
    
    if (!taskRows || (taskRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    const [rows] = await connection.execute(`
      SELECT tc.*, u.full_name as user_name, u.email as user_email
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [id]);
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ error: 'Failed to fetch task comments' });
  }
});

// Add task comment
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user?.userId || '6863bcc8-6851-44ce-abaf-15f8429e6956'; // Fallback for testing

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const connection = await pool.getConnection();

    // First check if user has access to this task
    const [taskRows] = await connection.execute(
      'SELECT id FROM tasks WHERE id = ? AND (assigned_to = ? OR assigned_by = ?)',
      [id, userId, userId]
    );
    
    if (!taskRows || (taskRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const commentId = generateUUID();

    await connection.execute(
      'INSERT INTO task_comments (id, task_id, user_id, comment) VALUES (?, ?, ?, ?)',
      [commentId, id, userId, comment]
    );

    // Fetch the created comment with user info
    const [rows] = await connection.execute(`
      SELECT tc.*, u.full_name as user_name, u.email as user_email
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `, [commentId]);
    connection.release();

    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error adding task comment:', error);
    res.status(500).json({ error: 'Failed to add task comment' });
  }
});

// Send task notifications
app.post('/api/tasks/:id/notifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, updated_by, accepted_by, comment_id, commented_by } = req.body;

    const connection = await pool.getConnection();
    
    // Get task details
    const [taskRows] = await connection.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    
    if (!taskRows || (taskRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = (taskRows as any[])[0];
    connection.release();

    // Send appropriate notification based on type
    try {
      if (type === 'status_update') {
        const updatedByUser = await getUserById(updated_by);
        const assignedByUser = await getUserById(task.assigned_by);
        
        if (updatedByUser && assignedByUser) {
          await EmailService.sendTaskStatusUpdateEmail({
            taskId: id,
            taskTitle: task.title,
            assignedByEmail: assignedByUser.email,
            assignedByName: assignedByUser.full_name,
            updatedByName: updatedByUser.full_name,
            newStatus: status,
            dueDate: task.due_date
          });
          
          console.log(`✅ Task status update email sent to ${assignedByUser.email}`);
        }
      } else if (type === 'task_accepted') {
        const acceptedByUser = await getUserById(accepted_by);
        const assignedByUser = await getUserById(task.assigned_by);
        
        if (acceptedByUser && assignedByUser) {
          await EmailService.sendTaskAcceptedEmail({
            taskId: id,
            taskTitle: task.title,
            assignedByEmail: assignedByUser.email,
            assignedByName: assignedByUser.full_name,
            acceptedByName: acceptedByUser.full_name,
            dueDate: task.due_date
          });
          
          console.log(`✅ Task accepted email sent to ${assignedByUser.email}`);
        }
      } else if (type === 'comment_added') {
        const commentedByUser = await getUserById(commented_by);
        const assignedByUser = await getUserById(task.assigned_by);
        
        if (commentedByUser && assignedByUser) {
          await EmailService.sendTaskCommentEmail({
            taskId: id,
            taskTitle: task.title,
            assignedByEmail: assignedByUser.email,
            assignedByName: assignedByUser.full_name,
            commentedByName: commentedByUser.full_name,
            commentId: comment_id
          });
          
          console.log(`✅ Task comment email sent to ${assignedByUser.email}`);
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send task notification email:', emailError);
      // Don't fail the notification if email fails
    }

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending task notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});



// ===== DOCUMENTS API ENDPOINTS =====
app.get('/api/documents', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM documents WHERE status != ? ORDER BY created_at DESC',
      ['deleted']
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { 
      title, 
      file_name, 
      file_type, 
      file_size, 
      file_path, 
      file_url, 
      mime_type, 
      document_type, 
      uploaded_by, 
      case_id, 
      contract_id 
    } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const fileUrlValue = file_url || null;
    const mimeTypeValue = mime_type || null;
    const caseIdValue = case_id || null;
    const contractIdValue = contract_id || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, uploaded_by, case_id, contract_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, file_name, file_type, file_size, file_path, fileUrlValue, mimeTypeValue, document_type, uploaded_by, caseIdValue, contractIdValue, 'draft']
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get documents by case ID
app.get('/api/cases/:caseId/documents', async (req, res) => {
  try {
    const { caseId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT d.*, u.full_name as uploaded_by_name FROM documents d JOIN users u ON d.uploaded_by = u.id WHERE d.case_id = ? AND d.status != ? ORDER BY d.created_at DESC',
      [caseId, 'deleted']
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching case documents:', error);
    res.status(500).json({ error: 'Failed to fetch case documents' });
  }
});

// Upload document for a case
app.post('/api/cases/:caseId/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { title, document_type, uploaded_by } = req.body;
    
    console.log('Upload request received:', { caseId, title, document_type, uploaded_by });
    console.log('File info:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!title || !document_type || !uploaded_by) {
      return res.status(400).json({ error: 'Missing required fields: title, document_type, or uploaded_by' });
    }
    
    const id = generateUUID();
    const file_path = req.file.path;
    const file_url = `/uploads/${req.file.filename}`;
    
    console.log('Inserting document with data:', {
      id, title, file_name: req.file.originalname, file_type: req.file.mimetype, 
      file_size: req.file.size, file_path, file_url, document_type, uploaded_by, caseId
    });
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, uploaded_by, case_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.file.originalname, req.file.mimetype, req.file.size, file_path, file_url, req.file.mimetype, document_type, uploaded_by, caseId, 'draft']
    );
    
    const [rows] = await connection.execute(
      'SELECT d.*, u.full_name as uploaded_by_name FROM documents d JOIN users u ON d.uploaded_by = u.id WHERE d.id = ?',
      [id]
    );
    connection.release();
    
    console.log('Document uploaded successfully:', (rows as any[])[0]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get documents by contract ID
app.get('/api/contracts/:contractId/documents', async (req, res) => {
  try {
    const { contractId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT d.*, u.full_name as uploaded_by_name FROM documents d JOIN users u ON d.uploaded_by = u.id WHERE d.contract_id = ? AND d.status != ? ORDER BY d.created_at DESC',
      [contractId, 'deleted']
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contract documents:', error);
    res.status(500).json({ error: 'Failed to fetch contract documents' });
  }
});

// Upload document for a contract
app.post('/api/contracts/:contractId/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const { contractId } = req.params;
    const { title, document_type, uploaded_by } = req.body;
    
    console.log('Contract document upload request received:', { contractId, title, document_type, uploaded_by });
    console.log('File info:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!title || !document_type || !uploaded_by) {
      return res.status(400).json({ error: 'Missing required fields: title, document_type, or uploaded_by' });
    }
    
    const id = generateUUID();
    const file_path = req.file.path;
    const file_url = `/uploads/${req.file.filename}`;
    
    console.log('Inserting contract document with data:', {
      id, title, file_name: req.file.originalname, file_type: req.file.mimetype, 
      file_size: req.file.size, file_path, file_url, document_type, uploaded_by, contractId
    });
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, uploaded_by, contract_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.file.originalname, req.file.mimetype, req.file.size, file_path, file_url, req.file.mimetype, document_type, uploaded_by, contractId, 'draft']
    );
    
    const [rows] = await connection.execute(
      'SELECT d.*, u.full_name as uploaded_by_name FROM documents d JOIN users u ON d.uploaded_by = u.id WHERE d.id = ?',
      [id]
    );
    connection.release();
    
    console.log('Contract document uploaded successfully:', (rows as any[])[0]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error uploading contract document:', error);
    res.status(500).json({ error: 'Failed to upload contract document', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Delete document
app.delete('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const connection = await pool.getConnection();
    
    // Get document info before deletion
    const [docRows] = await connection.execute(
      'SELECT file_path FROM documents WHERE id = ?',
      [documentId]
    );
    
    if ((docRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = (docRows as any[])[0];
    
    // Soft delete - update status to deleted
    await connection.execute(
      'UPDATE documents SET status = ? WHERE id = ?',
      ['deleted', documentId]
    );
    
    connection.release();
    
    // Optionally delete the actual file
    if (document.file_path && fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ===== USERS API ENDPOINTS =====
app.get('/api/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, full_name, email, role, status FROM users WHERE status = "active" ORDER BY full_name ASC'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ===== DEPARTMENTS API ENDPOINTS =====
app.get('/api/departments', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, name, description FROM departments WHERE status = "active" ORDER BY name ASC'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// ===== CASE ASSIGNMENTS API ENDPOINTS =====
app.get('/api/cases/:caseId/assignments', async (req, res) => {
  try {
    const { caseId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT ca.*, u.full_name, u.email FROM case_assignments ca JOIN users u ON ca.user_id = u.id WHERE ca.case_id = ?',
      [caseId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching case assignments:', error);
    res.status(500).json({ error: 'Failed to fetch case assignments' });
  }
});

app.post('/api/cases/:caseId/assignments', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { user_id, role, assigned_by } = req.body;
    const id = generateUUID();
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO case_assignments (id, case_id, user_id, role, assigned_by) VALUES (?, ?, ?, ?, ?)',
      [id, caseId, user_id, role, assigned_by]
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM case_assignments WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating case assignment:', error);
    res.status(500).json({ error: 'Failed to create case assignment' });
  }
});

app.delete('/api/cases/:caseId/assignments/:assignmentId', async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM case_assignments WHERE id = ? AND case_id = ?',
      [assignmentId, caseId]
    );
    connection.release();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting case assignment:', error);
    res.status(500).json({ error: 'Failed to delete case assignment' });
  }
});

// ===== CONTRACT EXPIRY NOTIFICATIONS API ENDPOINTS =====
app.post('/api/contracts/check-expiry', async (req, res) => {
  try {
    await ContractExpiryService.checkAndSendExpiryNotifications();
    res.json({ message: 'Contract expiry check completed successfully' });
  } catch (error) {
    console.error('Error checking contract expiry:', error);
    res.status(500).json({ error: 'Failed to check contract expiry' });
  }
});

app.get('/api/contracts/expiry-notifications', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        cen.*,
        c.title as contract_title,
        c.contract_number,
        c.end_date
      FROM contract_expiry_notifications cen
      JOIN contracts c ON cen.contract_id = c.id
      ORDER BY cen.sent_at DESC
      LIMIT 100
    `);
    connection.release();
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching expiry notifications:', error);
    res.status(500).json({ error: 'Failed to fetch expiry notifications' });
  }
});

// ===== BUDGET MANAGEMENT API ENDPOINTS =====
import { BudgetService } from './budgetService';

const budgetService = new BudgetService();

// Budget Categories
app.get('/api/budget/categories', async (req, res) => {
  try {
    const categories = await budgetService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({ error: 'Failed to fetch budget categories' });
  }
});

app.post('/api/budget/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const category = await budgetService.createCategory({
      name,
      description,
      color: color || '#3B82F6',
      is_active: true,
      created_by: req.user.userId
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating budget category:', error);
    res.status(500).json({ error: 'Failed to create budget category' });
  }
});

app.put('/api/budget/categories/:id', authenticateToken, async (req, res) => {
  try {
    const category = await budgetService.updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ error: 'Budget category not found' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error updating budget category:', error);
    res.status(500).json({ error: 'Failed to update budget category' });
  }
});

app.delete('/api/budget/categories/:id', authenticateToken, async (req, res) => {
  try {
    await budgetService.updateCategory(req.params.id, { is_active: false });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting budget category:', error);
    res.status(500).json({ error: 'Failed to delete budget category' });
  }
});

// Budgets
app.get('/api/budgets', async (req, res) => {
  try {
    const { status, department_id, period_type, start_date, end_date } = req.query;
    const filters = {
      status: status as string,
      department_id: department_id as string,
      period_type: period_type as string,
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined
    };
    const budgets = await budgetService.getBudgets(filters);
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  try {
    console.log('Budget creation request body:', req.body);
    console.log('User ID:', req.user.userId);
    
    const budgetData = {
      ...req.body,
      created_by: req.user.userId
    };
    
    console.log('Budget data being passed to service:', budgetData);
    
    const budget = await budgetService.createBudget(budgetData);
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

app.get('/api/budgets/:id', async (req, res) => {
  try {
    const budget = await budgetService.getBudgetById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

app.put('/api/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const budget = await budgetService.updateBudget(req.params.id, req.body);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

app.post('/api/budgets/:id/approve', authenticateToken, async (req, res) => {
  try {
    const budget = await budgetService.approveBudget(req.params.id, req.user.userId);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    console.error('Error approving budget:', error);
    res.status(500).json({ error: 'Failed to approve budget' });
  }
});

// Budget Allocations
app.get('/api/budgets/:id/allocations', async (req, res) => {
  try {
    const allocations = await budgetService.getAllocations(req.params.id);
    res.json(allocations);
  } catch (error) {
    console.error('Error fetching budget allocations:', error);
    res.status(500).json({ error: 'Failed to fetch budget allocations' });
  }
});

app.post('/api/budgets/:id/allocations', authenticateToken, async (req, res) => {
  try {
    const allocation = await budgetService.createAllocation({
      ...req.body,
      budget_id: req.params.id,
      created_by: req.user.userId
    });
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Error creating budget allocation:', error);
    res.status(500).json({ error: 'Failed to create budget allocation' });
  }
});

// Budget Expenditures
app.get('/api/budgets/:id/expenditures', async (req, res) => {
  try {
    const { category_id, status, start_date, end_date } = req.query;
    const filters = {
      category_id: category_id as string,
      status: status as string,
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined
    };
    const expenditures = await budgetService.getExpenditures(req.params.id, filters);
    res.json(expenditures);
  } catch (error) {
    console.error('Error fetching budget expenditures:', error);
    res.status(500).json({ error: 'Failed to fetch budget expenditures' });
  }
});

app.post('/api/budgets/:id/expenditures', authenticateToken, async (req, res) => {
  try {
    console.log('Expenditure creation request body:', req.body);
    console.log('Budget ID:', req.params.id);
    console.log('User ID:', req.user.userId);
    
    const expenditureData = {
      ...req.body,
      budget_id: req.params.id,
      created_by: req.user.userId
    };
    
    console.log('Expenditure data being passed to service:', expenditureData);
    
    const expenditure = await budgetService.createExpenditure(expenditureData);
    res.status(201).json(expenditure);
  } catch (error) {
    console.error('Error creating budget expenditure:', error);
    res.status(500).json({ error: 'Failed to create budget expenditure' });
  }
});

app.put('/api/expenditures/:id', authenticateToken, async (req, res) => {
  try {
    const expenditure = await budgetService.updateExpenditure(req.params.id, req.body);
    if (!expenditure) {
      return res.status(404).json({ error: 'Expenditure not found' });
    }
    res.json(expenditure);
  } catch (error) {
    console.error('Error updating expenditure:', error);
    res.status(500).json({ error: 'Failed to update expenditure' });
  }
});

app.post('/api/expenditures/:id/approve', authenticateToken, async (req, res) => {
  try {
    const expenditure = await budgetService.approveExpenditure(req.params.id, req.user.userId);
    if (!expenditure) {
      return res.status(404).json({ error: 'Expenditure not found' });
    }
    res.json(expenditure);
  } catch (error) {
    console.error('Error approving expenditure:', error);
    res.status(500).json({ error: 'Failed to approve expenditure' });
  }
});

// Budget Transfers
app.get('/api/budgets/:id/transfers', async (req, res) => {
  try {
    const transfers = await budgetService.getTransfers(req.params.id);
    res.json(transfers);
  } catch (error) {
    console.error('Error fetching budget transfers:', error);
    res.status(500).json({ error: 'Failed to fetch budget transfers' });
  }
});

app.post('/api/budgets/:id/transfers', authenticateToken, async (req, res) => {
  try {
    const transfer = await budgetService.createTransfer({
      ...req.body,
      budget_id: req.params.id,
      created_by: req.user.userId
    });
    res.status(201).json(transfer);
  } catch (error) {
    console.error('Error creating budget transfer:', error);
    res.status(500).json({ error: 'Failed to create budget transfer' });
  }
});

app.post('/api/transfers/:id/approve', authenticateToken, async (req, res) => {
  try {
    const transfer = await budgetService.approveTransfer(req.params.id, req.user.userId);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    res.json(transfer);
  } catch (error) {
    console.error('Error approving transfer:', error);
    res.status(500).json({ error: 'Failed to approve transfer' });
  }
});

// Budget Analytics
app.get('/api/budgets/:id/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await budgetService.getBudgetSummary(req.params.id);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

app.get('/api/budgets/:id/monthly-spending', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const monthlyData = await budgetService.getMonthlySpending(req.params.id, parseInt(year as string) || new Date().getFullYear());
    res.json(monthlyData);
  } catch (error) {
    console.error('Error fetching monthly spending:', error);
    res.status(500).json({ error: 'Failed to fetch monthly spending' });
  }
});

app.get('/api/budgets/:id/category-spending', authenticateToken, async (req, res) => {
  try {
    const categoryData = await budgetService.getCategorySpending(req.params.id);
    res.json(categoryData);
  } catch (error) {
    console.error('Error fetching category spending:', error);
    res.status(500).json({ error: 'Failed to fetch category spending' });
  }
});

// ===== CASE UPDATES API ENDPOINTS =====
app.get('/api/cases/:caseId/updates', async (req, res) => {
  try {
    const { caseId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT cu.*, u.full_name FROM case_updates cu JOIN users u ON cu.user_id = u.id WHERE cu.case_id = ? ORDER BY cu.created_at DESC',
      [caseId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching case updates:', error);
    res.status(500).json({ error: 'Failed to fetch case updates' });
  }
});

app.post('/api/cases/:caseId/updates', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { user_id, update_type, title, content } = req.body;
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const contentValue = content || null;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO case_updates (id, case_id, user_id, update_type, title, content) VALUES (?, ?, ?, ?, ?, ?)',
      [id, caseId, user_id, update_type, title, contentValue]
    );
    
    const [rows] = await connection.execute(
      'SELECT * FROM case_updates WHERE id = ?',
      [id]
    );
    connection.release();
    
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating case update:', error);
    res.status(500).json({ error: 'Failed to create case update' });
  }
});

// ===== CALENDAR API ENDPOINTS =====
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;
    
    const events = await CalendarService.getUserEvents(
      userId, 
      startDate as string, 
      endDate as string
    );
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

app.get('/api/calendar/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    
    const event = await CalendarService.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if user has access to this event
    const userEvents = await CalendarService.getUserEvents(userId);
    const hasAccess = userEvents.some(e => e.id === eventId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const attendees = await CalendarService.getEventAttendees(eventId);
    
    res.json({ event, attendees });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
});

app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const eventData = req.body;
    const event = await CalendarService.createEvent(eventData, userId);
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

app.put('/api/calendar/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    
    const updateData = req.body;
    const event = await CalendarService.updateEvent(eventId, updateData, userId);
    
    res.json(event);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

app.delete('/api/calendar/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    
    await CalendarService.deleteEvent(eventId, userId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

app.put('/api/calendar/events/:eventId/attendees/:attendeeId/response', authenticateToken, async (req, res) => {
  try {
    const { eventId, attendeeId } = req.params;
    const { responseStatus } = req.body;
    const userId = req.user.userId;
    
    await CalendarService.updateAttendeeResponse(eventId, attendeeId, responseStatus, userId);
    
    res.json({ message: 'Response updated successfully' });
  } catch (error) {
    console.error('Error updating attendee response:', error);
    res.status(500).json({ error: 'Failed to update attendee response' });
  }
});

app.get('/api/calendar/upcoming', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user.userId;
    
    const events = await CalendarService.getUpcomingEvents(userId, Number(days));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Compliance API endpoints

// Create a new compliance run
app.post('/api/compliance/runs', authenticateToken, async (req, res) => {
  try {
    const { title, description, frequency, startDate, dueDate, departmentIds, questions } = req.body;
    const userId = req.user.userId;

    if (!title || !description || !frequency || !startDate || !dueDate || !departmentIds || !questions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const complianceRun = await ComplianceService.createComplianceRun({
      title,
      description,
      frequency,
      startDate,
      dueDate,
      departmentIds,
      questions,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: complianceRun });
  } catch (error) {
    console.error('Error creating compliance run:', error);
    res.status(500).json({ error: 'Failed to create compliance run' });
  }
});

// Get all compliance runs
app.get('/api/compliance/runs', authenticateToken, async (req, res) => {
  try {
    const runs = await ComplianceService.getComplianceRuns();
    res.json({ success: true, data: runs });
  } catch (error) {
    console.error('Error getting compliance runs:', error);
    res.status(500).json({ error: 'Failed to get compliance runs' });
  }
});

// Get compliance run details
app.get('/api/compliance/runs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const details = await ComplianceService.getComplianceRunDetails(id);
    res.json({ success: true, data: details });
  } catch (error) {
    console.error('Error getting compliance run details:', error);
    res.status(500).json({ error: 'Failed to get compliance run details' });
  }
});

// Activate a compliance run (send notifications)
app.post('/api/compliance/runs/:id/activate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await ComplianceService.activateComplianceRun(id);
    
    if (success) {
      res.json({ success: true, message: 'Compliance run activated and notifications sent' });
    } else {
      res.status(500).json({ error: 'Failed to activate compliance run' });
    }
  } catch (error) {
    console.error('Error activating compliance run:', error);
    res.status(500).json({ error: 'Failed to activate compliance run' });
  }
});

// Get compliance survey by token (public endpoint)
app.get('/api/compliance/survey/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const surveyData = await ComplianceService.getComplianceRunByToken(token);
    
    if (!surveyData) {
      return res.status(404).json({ error: 'Survey not found or expired' });
    }

    res.json({ success: true, data: surveyData });
  } catch (error) {
    console.error('Error getting compliance survey:', error);
    res.status(500).json({ error: 'Failed to get compliance survey' });
  }
});

// Submit compliance survey responses (public endpoint)
app.post('/api/compliance/survey/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Invalid responses format' });
    }

    const success = await ComplianceService.submitComplianceResponses(token, responses);
    
    if (success) {
      res.json({ success: true, message: 'Survey responses submitted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to submit survey responses' });
    }
  } catch (error) {
    console.error('Error submitting compliance survey:', error);
    res.status(500).json({ error: 'Failed to submit survey responses' });
  }
});

// ChatPDF API endpoints
const CHATPDF_API_KEY = process.env.CHATPDF_API_KEY;
const CHATPDF_BASE_URL = 'https://api.chatpdf.com/v1';

// Add PDF source from URL
app.post('/api/chatpdf/add-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!CHATPDF_API_KEY) {
      return res.status(500).json({ error: 'ChatPDF API key not configured' });
    }

    const response = await fetch(`${CHATPDF_BASE_URL}/sources/add-url`, {
      method: 'POST',
      headers: {
        'x-api-key': CHATPDF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatPDF API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json({ sourceId: data.sourceId });
  } catch (error) {
    console.error('Error adding PDF from URL:', error);
    res.status(500).json({ error: 'Failed to add PDF from URL' });
  }
});

// Add PDF source from file upload
app.post('/api/chatpdf/add-file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!CHATPDF_API_KEY) {
      return res.status(500).json({ error: 'ChatPDF API key not configured' });
    }

    // Check if file is PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    // Create form data for ChatPDF API using buffer approach
    const FormData = require('form-data');
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(req.file.path);
    formData.append('file', fileBuffer, {
      filename: req.file.originalname,
      contentType: 'application/pdf'
    });

    console.log('Uploading file to ChatPDF:', {
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      bufferSize: fileBuffer.length
    });

    const response = await fetch(`${CHATPDF_BASE_URL}/sources/add-file`, {
      method: 'POST',
      headers: {
        'x-api-key': CHATPDF_API_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log('ChatPDF response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log('ChatPDF error response:', errorText);
      throw new Error(`ChatPDF API error: ${response.status} - ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatPDF API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ sourceId: data.sourceId });
  } catch (error) {
    console.error('Error uploading PDF file:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload PDF file' });
  }
});

// Send chat message to PDF
app.post('/api/chatpdf/chat', authenticateToken, async (req, res) => {
  try {
    const { sourceId, messages, referenceSources = true, stream = false } = req.body;
    
    if (!CHATPDF_API_KEY) {
      return res.status(500).json({ error: 'ChatPDF API key not configured' });
    }

    if (!sourceId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const response = await fetch(`${CHATPDF_BASE_URL}/chats/message`, {
      method: 'POST',
      headers: {
        'x-api-key': CHATPDF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceId,
        messages,
        referenceSources,
        stream
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatPDF API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send chat message' });
  }
});

// Delete PDF source
app.delete('/api/chatpdf/sources', authenticateToken, async (req, res) => {
  try {
    const { sources } = req.body;
    
    if (!CHATPDF_API_KEY) {
      return res.status(500).json({ error: 'ChatPDF API key not configured' });
    }

    if (!sources || !Array.isArray(sources)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const response = await fetch(`${CHATPDF_BASE_URL}/sources/delete`, {
      method: 'POST',
      headers: {
        'x-api-key': CHATPDF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sources }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatPDF API error: ${response.status} - ${errorText}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting PDF sources:', error);
    res.status(500).json({ error: 'Failed to delete PDF sources' });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // Initialize contract expiry notification system
    await ContractExpiryService.initializeNotificationTable();
    ContractExpiryService.startScheduledJob();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: MySQL (${process.env.DB_NAME || 'prolegal_db'})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
