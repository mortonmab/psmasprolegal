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
import crypto from 'crypto';

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
  id?: string;
  name?: string;
  url: string;
  source_type?: string;
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
  data?: Array<{
    title: string;
    content: string;
    date: string | null;
    reference: string | null;
    source_url?: string;
  }>;
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
    
    // Check if this is a Veritas Zimbabwe source
    const isVeritasSource = source.url.includes('veritaszim.net');
    
    let scrapedData = [];
    
    if (isVeritasSource) {
      // For Veritas Zimbabwe, we need to scrape case listings
      scrapedData = await page.evaluate((sourceUrl: string) => {
        const cases: Array<{
          title: string;
          content: string;
          date: string | null;
          reference: string;
          source_url: string;
        }> = [];
        
        // Look for case links in the content
        const caseLinks = document.querySelectorAll('a[href*="constitutional-court"], a[href*="supreme-court"], a[href*="high-court"], a[href*="electoral-court"], a[href*="labour-court"]');
        
        caseLinks.forEach((link) => {
          const title = link.textContent?.trim() || '';
          const href = link.getAttribute('href') || '';
          
          if (title && href) {
            cases.push({
              title,
              content: `Case: ${title}`,
              date: null,
              reference: href.split('/').pop() || '',
              source_url: href.startsWith('http') ? href : `https://www.veritaszim.net${href}`
            });
          }
        });
        
        // Also look for any text that looks like case references
        const textContent = document.body.textContent || '';
        const casePattern = /(CCZ|SC|HH|ECH|LC)\s*\d+[-\/]\d+/g;
        const matches = textContent.match(casePattern);
        
        if (matches) {
          matches.forEach((match) => {
            if (!cases.some(c => c.reference === match)) {
              cases.push({
                title: `Case ${match}`,
                content: `Case reference: ${match}`,
                date: null,
                reference: match,
                source_url: sourceUrl
              });
            }
          });
        }
        
        return cases;
      }, source.url);
    } else {
      // For other sources, use the original single-page scraping
      const data = await page.evaluate((selectors) => {
        const title = document.querySelector(selectors.title)?.textContent?.trim() || '';
        const content = document.querySelector(selectors.content)?.textContent?.trim() || '';
        const date = selectors.date ? document.querySelector(selectors.date)?.textContent?.trim() || null : null;
        const reference = selectors.reference ? document.querySelector(selectors.reference)?.textContent?.trim() || null : null;
        
        return { title, content, date, reference };
      }, source.selectors);
      
      scrapedData = [{
        ...data,
        source_url: source.url
      }];
    }
    
    await browser.close();
    
    // Store scraped data in MySQL
    const connection = await pool.getConnection();
    try {
      for (const data of scrapedData) {
        await connection.execute(
          'INSERT INTO scraped_data (id, title, content, source_type, source_url, source_name, date_published, reference_number, jurisdiction, keywords, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            crypto.randomUUID(),
            data.title,
            data.content,
            source.source_type || 'case_law',
            data.source_url,
            source.name || 'Unknown Source',
            data.date,
            data.reference,
            'Zimbabwe',
            `${source.name || 'Unknown Source'} ${data.title}`
          ]
        );
      }
    } finally {
      connection.release();
    }

    scrapeJobs.set(jobId, {
      status: 'completed', 
      progress: 100,
      data: scrapedData
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

// ===== REPORTS API ENDPOINTS =====
import { ReportsService } from './reportsService';

// Get case summary report
app.get('/api/reports/cases', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      department: req.query.department as string,
      assigned_to: req.query.assigned_to as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    // Simple test query first
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          c.id,
          c.case_number,
          c.case_name,
          c.status,
          c.case_type,
          c.priority,
          c.filing_date,
          c.court_name,
          c.client_name,
          c.judge_name,
          c.created_at,
          c.updated_at
        FROM cases c
        ORDER BY c.created_at DESC
        LIMIT 20
      `);

      res.json({
        data: rows,
        total: (rows as any[]).length,
        page: 1,
        limit: 20,
        pages: 1
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching case summary report:', error);
    res.status(500).json({ error: 'Failed to fetch case summary report' });
  }
});

// Get contracts summary report
app.get('/api/reports/contracts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          c.id,
          c.contract_number,
          c.title,
          c.description,
          ct.name as contract_type,
          c.status,
          c.start_date,
          c.end_date,
          c.value,
          c.currency,
          c.payment_terms,
          v.name as vendor_name,
          v.company_type as vendor_type,
          v.contact_person as vendor_contact,
          v.email as vendor_email,
          v.phone as vendor_phone,
          d.name as department_name,
          c.created_at,
          c.updated_at,
          CASE 
            WHEN c.end_date < CURDATE() THEN 'Expired'
            WHEN c.end_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon'
            WHEN c.status = 'active' THEN 'Active'
            ELSE c.status
          END as contract_status
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_id = v.id
        LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
        LEFT JOIN departments d ON c.department_id = d.id
        ORDER BY c.created_at DESC
        LIMIT 50
      `);

      res.json({
        data: rows,
        total: (rows as any[]).length,
        page: 1,
        limit: 50,
        pages: 1
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching contracts summary report:', error);
    res.status(500).json({ error: 'Failed to fetch contracts summary report' });
  }
});

// Get financial summary report
app.get('/api/reports/financial', async (req, res) => {
  try {
    const filters = {
      period: req.query.period as string,
      type: req.query.type as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await ReportsService.getFinancialSummaryReport(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching financial summary report:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary report' });
  }
});

// Get user activity report
app.get('/api/reports/activity', async (req, res) => {
  try {
    const filters = {
      user: req.query.user as string,
      action: req.query.action as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await ReportsService.getUserActivityReport(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user activity report:', error);
    res.status(500).json({ error: 'Failed to fetch user activity report' });
  }
});

// Get performance metrics report
app.get('/api/reports/performance', async (req, res) => {
  try {
    const filters = {
      metric: req.query.metric as string,
      timeframe: req.query.timeframe as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await ReportsService.getPerformanceMetricsReport(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching performance metrics report:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics report' });
  }
});

// Get compliance report
app.get('/api/reports/compliance', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      category: req.query.category as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await ReportsService.getComplianceReport(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({ error: 'Failed to fetch compliance report' });
  }
});

// Get filter options for reports
app.get('/api/reports/filter-options/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const options = await ReportsService.getFilterOptions(reportType);
    res.json(options);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Export report data
app.get('/api/reports/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format, ...filters } = req.query;

    let result;
    switch (reportType) {
      case 'case-summary':
        result = await ReportsService.getCaseSummaryReport(filters);
        break;
      case 'contracts-summary':
        // Use the direct contracts endpoint for now
        const connection = await pool.getConnection();
        try {
          const [rows] = await connection.execute(`
            SELECT 
              c.id,
              c.contract_number,
              c.title,
              c.description,
              ct.name as contract_type,
              c.status,
              c.start_date,
              c.end_date,
              c.value,
              c.currency,
              c.payment_terms,
              v.name as vendor_name,
              v.company_type as vendor_type,
              v.contact_person as vendor_contact,
              v.email as vendor_email,
              v.phone as vendor_phone,
              d.name as department_name,
              c.created_at,
              c.updated_at
            FROM contracts c
            LEFT JOIN vendors v ON c.vendor_id = v.id
            LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
            LEFT JOIN departments d ON c.department_id = d.id
            ORDER BY c.created_at DESC
          `);
          result = {
            data: rows,
            total: (rows as any[]).length,
            page: 1,
            limit: 20,
            pages: 1
          };
        } finally {
          connection.release();
        }
        break;
      case 'financial-summary':
        result = await ReportsService.getFinancialSummaryReport(filters);
        break;
      case 'user-activity':
        result = await ReportsService.getUserActivityReport(filters);
        break;
      case 'performance-metrics':
        result = await ReportsService.getPerformanceMetricsReport(filters);
        break;
      case 'compliance-report':
        result = await ReportsService.getComplianceReport(filters);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    if (format === 'csv') {
      // Generate CSV
      const data = result.data as any[];
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      // Generate PDF (simplified for now)
      const data = result.data as any[];
      const pdfContent = `
        ${reportType.replace('-', ' ').toUpperCase()} REPORT
        Generated on: ${new Date().toLocaleDateString()}
        
        ${data.map((row: any) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')).join('\n')}
      `;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(pdfContent);
    } else {
      res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// ===== SCRAPING SOURCES API ENDPOINTS =====

// Get all scraping sources
app.get('/api/scraping-sources', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM scraping_sources ORDER BY created_at DESC'
      );
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching scraping sources:', error);
    res.status(500).json({ error: 'Failed to fetch scraping sources' });
  }
});

// Get scraping source by ID
app.get('/api/scraping-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length === 0) {
        res.status(404).json({ error: 'Scraping source not found' });
        return;
      }
      
      res.json((rows as any)[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching scraping source:', error);
    res.status(500).json({ error: 'Failed to fetch scraping source' });
  }
});

// Create new scraping source
app.post('/api/scraping-sources', async (req, res) => {
  try {
    const { name, url, source_type, selectors } = req.body;
    
    if (!name || !url || !source_type) {
      res.status(400).json({ error: 'Name, URL, and source_type are required' });
      return;
    }
    
    const id = crypto.randomUUID();
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT INTO scraping_sources (id, name, url, source_type, selectors) VALUES (?, ?, ?, ?, ?)',
        [id, name, url, source_type, JSON.stringify(selectors || {})]
      );
      
      const [rows] = await connection.execute(
        'SELECT * FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      res.status(201).json((rows as any)[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating scraping source:', error);
    res.status(500).json({ error: 'Failed to create scraping source' });
  }
});

// Update scraping source
app.put('/api/scraping-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, source_type, is_active, selectors } = req.body;
    
    console.log('Updating scraping source:', { id, name, url, source_type, is_active, selectors });
    
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length === 0) {
        res.status(404).json({ error: 'Scraping source not found' });
        return;
      }
      
      // Build dynamic update query based on provided fields
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (url !== undefined) {
        updateFields.push('url = ?');
        updateValues.push(url);
      }
      if (source_type !== undefined) {
        updateFields.push('source_type = ?');
        updateValues.push(source_type);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }
      if (selectors !== undefined) {
        updateFields.push('selectors = ?');
        updateValues.push(JSON.stringify(selectors));
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);
      
      const updateQuery = `UPDATE scraping_sources SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log('Update query:', updateQuery, updateValues);
      
      await connection.execute(updateQuery, updateValues);
      
      const [updatedRows] = await connection.execute(
        'SELECT * FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      res.json((updatedRows as any)[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating scraping source:', error);
    res.status(500).json({ error: 'Failed to update scraping source' });
  }
});

// Delete scraping source
app.delete('/api/scraping-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length === 0) {
        res.status(404).json({ error: 'Scraping source not found' });
        return;
      }
      
      await connection.execute(
        'DELETE FROM scraping_sources WHERE id = ?',
        [id]
      );
      
      res.status(204).send();
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting scraping source:', error);
    res.status(500).json({ error: 'Failed to delete scraping source' });
  }
});

// ===== SCRAPED DATA API ENDPOINTS =====

// Get scraped data with search and filtering
app.get('/api/scraped-data', async (req, res) => {
  try {
    const { 
      search, 
      source_type, 
      jurisdiction, 
      page = 1, 
      limit = 20,
      sort_by = 'scraped_at',
      sort_order = 'desc'
    } = req.query;
    
    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['scraped_at', 'title', 'date_published', 'source_name'];
    const safeSortBy = allowedSortFields.includes(sort_by as string) ? sort_by : 'scraped_at';
    const safeSortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ? OR keywords LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (source_type) {
      whereClause += ' AND source_type = ?';
      params.push(source_type);
    }
    
    if (jurisdiction) {
      whereClause += ' AND jurisdiction = ?';
      params.push(jurisdiction);
    }
    
    const connection = await pool.getConnection();
    try {
      // Get total count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM scraped_data ${whereClause}`,
        params
      );
      const total = (countRows as any)[0].total;
      
      // Get paginated results
      const [rows] = await connection.execute(
        `SELECT * FROM scraped_data ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`,
        [...params, parseInt(limit as string), parseInt(offset.toString())]
      );
      
      res.json({
        data: rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    res.status(500).json({ error: 'Failed to fetch scraped data' });
  }
});

// Get scraped data by ID
app.get('/api/scraped-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM scraped_data WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length === 0) {
        res.status(404).json({ error: 'Scraped data not found' });
        return;
      }
      
      res.json((rows as any)[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    res.status(500).json({ error: 'Failed to fetch scraped data' });
  }
});

// Get scraped data statistics
app.get('/api/scraped-data/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM scraped_data');
      const [typeRows] = await connection.execute('SELECT source_type, COUNT(*) as count FROM scraped_data GROUP BY source_type');
      const [recentRows] = await connection.execute('SELECT COUNT(*) as recent FROM scraped_data WHERE scraped_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
      
      res.json({
        total: (totalRows as any)[0].total,
        byType: typeRows,
        recent: (recentRows as any)[0].recent
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching scraped data stats:', error);
    res.status(500).json({ error: 'Failed to fetch scraped data statistics' });
  }
});

// Manual upload endpoint
app.post('/api/scraped-data/manual-upload', upload.single('file'), async (req, res) => {
  try {
    const { title, source_type } = req.body;
    const file = req.file;

    if (!title || !source_type || !file) {
      return res.status(400).json({ error: 'Title, source_type, and file are required' });
    }

    // Extract content from file
    let content = '';
    if (file.mimetype === 'text/plain') {
      content = file.buffer.toString('utf8');
    } else {
      // For other file types, store file path and extract content later if needed
      content = `File uploaded: ${file.originalname}`;
    }

    const connection = await pool.getConnection();
    try {
      const id = crypto.randomUUID();
      
      await connection.execute(
        'INSERT INTO scraped_data (id, title, content, source_type, source_url, source_name, date_published, reference_number, jurisdiction, keywords, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          id,
          title,
          content,
          source_type,
          file.path || '',
          'Manual Upload',
          new Date().toISOString().split('T')[0],
          '',
          'Zimbabwe',
          `${title} ${source_type}`
        ]
      );

      res.status(201).json({
        id,
        message: 'Legal resource uploaded successfully'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error uploading legal resource:', error);
    res.status(500).json({ error: 'Failed to upload legal resource' });
  }
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
      category,
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
    const categoryValue = category || 'other';
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, category, uploaded_by, case_id, contract_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, file_name, file_type, file_size, file_path, fileUrlValue, mimeTypeValue, document_type, categoryValue, uploaded_by, caseIdValue, contractIdValue, 'draft']
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
    const { title, document_type, category, uploaded_by } = req.body;
    
    console.log('Upload request received:', { caseId, title, document_type, category, uploaded_by });
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
    const categoryValue = category || 'cases'; // Default to 'cases' for case documents
    
    console.log('Inserting document with data:', {
      id, title, file_name: req.file.originalname, file_type: req.file.mimetype, 
      file_size: req.file.size, file_path, file_url, document_type, category: categoryValue, uploaded_by, caseId
    });
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, category, uploaded_by, case_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.file.originalname, req.file.mimetype, req.file.size, file_path, file_url, req.file.mimetype, document_type, categoryValue, uploaded_by, caseId, 'draft']
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
    const { title, document_type, category, uploaded_by } = req.body;
    
    console.log('Contract document upload request received:', { contractId, title, document_type, category, uploaded_by });
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
    const categoryValue = category || 'contracts'; // Default to 'contracts' for contract documents
    
    console.log('Inserting contract document with data:', {
      id, title, file_name: req.file.originalname, file_type: req.file.mimetype, 
      file_size: req.file.size, file_path, file_url, document_type, category: categoryValue, uploaded_by, contractId
    });
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, category, uploaded_by, contract_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.file.originalname, req.file.mimetype, req.file.size, file_path, file_url, req.file.mimetype, document_type, categoryValue, uploaded_by, contractId, 'draft']
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

// Upload general document with category
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, document_type, category, uploaded_by } = req.body;
    
    console.log('General document upload request received:', { title, document_type, category, uploaded_by });
    console.log('File info:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!title || !document_type || !category || !uploaded_by) {
      return res.status(400).json({ error: 'Missing required fields: title, document_type, category, or uploaded_by' });
    }
    
    const id = generateUUID();
    const file_path = req.file.path;
    const file_url = `/uploads/${req.file.filename}`;
    
    console.log('Inserting general document with data:', {
      id, title, file_name: req.file.originalname, file_type: req.file.mimetype, 
      file_size: req.file.size, file_path, file_url, document_type, category, uploaded_by
    });
    
    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO documents (id, title, file_name, file_type, file_size, file_path, file_url, mime_type, document_type, category, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, req.file.originalname, req.file.mimetype, req.file.size, file_path, file_url, req.file.mimetype, document_type, category, uploaded_by, 'draft']
    );
    
    const [rows] = await connection.execute(
      'SELECT d.*, u.full_name as uploaded_by_name FROM documents d JOIN users u ON d.uploaded_by = u.id WHERE d.id = ?',
      [id]
    );
    connection.release();
    
    console.log('General document uploaded successfully:', (rows as any[])[0]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error uploading general document:', error);
    res.status(500).json({ error: 'Failed to upload general document', details: error instanceof Error ? error.message : 'Unknown error' });
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

// ===== TIMESHEET API ENDPOINTS =====
app.get('/api/timesheet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;
    const connection = await pool.getConnection();
    let query = `
      SELECT te.*
      FROM timesheet_entries te
      WHERE te.user_id = ?
    `;
    const params: any[] = [userId];
    if (startDate && endDate) {
      query += ' AND te.entry_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY te.entry_date DESC, te.start_time DESC';
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching timesheet entries:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet entries' });
  }
});

app.post('/api/timesheet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      entry_date,
      start_time,
      end_time,
      description,
      category,
      case_id,
      contract_id,
      hours
    } = req.body;

    if (!entry_date || !start_time || !end_time || !category || !hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = generateUUID();
    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO timesheet_entries 
        (id, user_id, entry_date, start_time, end_time, description, category, case_id, contract_id, hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, entry_date, start_time, end_time, description || null, category, case_id || null, contract_id || null, hours]
    );

    const [rows] = await connection.execute('SELECT * FROM timesheet_entries WHERE id = ?', [id]);
    connection.release();
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating timesheet entry:', error);
    res.status(500).json({ error: 'Failed to create timesheet entry' });
  }
});

// ===== LAW FIRM API ENDPOINTS =====
app.get('/api/law-firms', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT * FROM law_firms 
      WHERE status = 'active'
      ORDER BY firm_type DESC, name ASC
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching law firms:', error);
    res.status(500).json({ error: 'Failed to fetch law firms' });
  }
});

app.get('/api/law-firms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM law_firms WHERE id = ?',
      [id]
    );
    connection.release();
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }
    
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching law firm:', error);
    res.status(500).json({ error: 'Failed to fetch law firm' });
  }
});

app.post('/api/law-firms', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      firm_type,
      address,
      city,
      state,
      country,
      postal_code,
      contact_person,
      email,
      phone,
      website,
      specializations,
      bar_number,
      status
    } = req.body;

    if (!name || !firm_type) {
      return res.status(400).json({ error: 'Name and firm type are required' });
    }

    const lawFirmId = generateUUID();
    const connection = await pool.getConnection();
    
    await connection.execute(`
      INSERT INTO law_firms (
        id, name, firm_type, address, city, state, country, postal_code,
        contact_person, email, phone, website, specializations, bar_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lawFirmId, name, firm_type, address || null, city || null, state || null, country || null, postal_code || null,
      contact_person || null, email || null, phone || null, website || null, specializations || null, bar_number || null, status || 'active'
    ]);

    // Fetch the created law firm
    const [rows] = await connection.execute(
      'SELECT * FROM law_firms WHERE id = ?',
      [lawFirmId]
    );
    
    connection.release();
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating law firm:', error);
    res.status(500).json({ error: 'Failed to create law firm' });
  }
});

app.put('/api/law-firms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      firm_type,
      address,
      city,
      state,
      country,
      postal_code,
      contact_person,
      email,
      phone,
      website,
      specializations,
      bar_number,
      status
    } = req.body;

    const connection = await pool.getConnection();
    
    // Check if law firm exists
    const [existingRows] = await connection.execute(
      'SELECT id FROM law_firms WHERE id = ?',
      [id]
    );
    
    if ((existingRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Law firm not found' });
    }

    await connection.execute(`
      UPDATE law_firms SET
        name = COALESCE(?, name),
        firm_type = COALESCE(?, firm_type),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        postal_code = COALESCE(?, postal_code),
        contact_person = COALESCE(?, contact_person),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        website = COALESCE(?, website),
        specializations = COALESCE(?, specializations),
        bar_number = COALESCE(?, bar_number),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || null, firm_type || null, address || null, city || null, state || null, country || null, postal_code || null,
      contact_person || null, email || null, phone || null, website || null, specializations || null, bar_number || null, status || null, id
    ]);

    // Fetch the updated law firm
    const [rows] = await connection.execute(
      'SELECT * FROM law_firms WHERE id = ?',
      [id]
    );
    
    connection.release();
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating law firm:', error);
    res.status(500).json({ error: 'Failed to update law firm' });
  }
});

app.delete('/api/law-firms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Check if law firm exists
    const [existingRows] = await connection.execute(
      'SELECT id FROM law_firms WHERE id = ?',
      [id]
    );
    
    if ((existingRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Law firm not found' });
    }

    // Soft delete by setting status to inactive
    await connection.execute(
      'UPDATE law_firms SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    
    connection.release();
    res.json({ message: 'Law firm deleted successfully' });
  } catch (error) {
    console.error('Error deleting law firm:', error);
    res.status(500).json({ error: 'Failed to delete law firm' });
  }
});

// Get contracts assigned to a law firm
app.get('/api/law-firms/:id/contracts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Check if law firm exists
    const [lawFirmRows] = await connection.execute(
      'SELECT id, name FROM law_firms WHERE id = ? AND status = ?',
      [id, 'active']
    );
    
    if ((lawFirmRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Law firm not found' });
    }
    
    // Since there's no direct relationship between contracts and cases in the current schema,
    // we'll return contracts from the same department as cases assigned to this law firm
    const [contractRows] = await connection.execute(`
      SELECT DISTINCT 
        c.id,
        c.contract_number,
        c.title,
        c.description,
        c.start_date,
        c.end_date,
        c.status,
        c.value,
        c.currency,
        c.payment_terms,
        c.created_at,
        c.updated_at,
        v.name as vendor_name,
        ct.name as contract_type_name,
        d.name as department_name
      FROM contracts c
      LEFT JOIN vendors v ON c.vendor_id = v.id
      LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.department_id IN (
        SELECT DISTINCT department_id 
        FROM cases 
        WHERE law_firm_id = ? AND department_id IS NOT NULL
      )
      ORDER BY c.created_at DESC
    `, [id]);
    
    connection.release();
    res.json(contractRows);
  } catch (error) {
    console.error('Error fetching contracts for law firm:', error);
    res.status(500).json({ error: 'Failed to fetch contracts for law firm' });
  }
});

// Get cases assigned to a law firm
app.get('/api/law-firms/:id/cases', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Check if law firm exists
    const [lawFirmRows] = await connection.execute(
      'SELECT id, name FROM law_firms WHERE id = ? AND status = ?',
      [id, 'active']
    );
    
    if ((lawFirmRows as any[]).length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Law firm not found' });
    }
    
    // Get cases assigned to this law firm
    const [caseRows] = await connection.execute(`
      SELECT 
        c.id,
        c.case_number,
        c.case_name as title,
        c.description,
        c.case_type,
        c.status,
        c.priority,
        c.filing_date,
        c.court_name,
        c.court_case_number,
        c.estimated_completion_date,
        c.actual_completion_date,
        c.client_name,
        c.judge_name,
        c.opposing_counsel,
        c.estimated_value,
        c.notes,
        c.created_at,
        c.updated_at,
        d.name as department_name
      FROM cases c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.law_firm_id = ?
      ORDER BY c.created_at DESC
    `, [id]);
    
    connection.release();
    res.json(caseRows);
  } catch (error) {
    console.error('Error fetching cases for law firm:', error);
    res.status(500).json({ error: 'Failed to fetch cases for law firm' });
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

// Get survey responses for a compliance run
app.get('/api/compliance/runs/:runId/responses', authenticateToken, async (req, res) => {
  try {
    const { runId } = req.params;
    const responses = await ComplianceService.getSurveyResponses(runId);
    res.json({ success: true, data: responses });
  } catch (error) {
    console.error('Error getting survey responses:', error);
    res.status(500).json({ error: 'Failed to get survey responses' });
  }
});

// Generate survey report
app.get('/api/compliance/runs/:runId/report', authenticateToken, async (req, res) => {
  try {
    const { runId } = req.params;
    const report = await ComplianceService.generateSurveyReport(runId);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating survey report:', error);
    res.status(500).json({ error: 'Failed to generate survey report' });
  }
});

// Process recurring compliance surveys
app.post('/api/compliance/process-recurring', authenticateToken, async (req, res) => {
  try {
    const { RecurringComplianceService } = await import('./recurringComplianceService');
    await RecurringComplianceService.processRecurringSurveys();
    res.json({ success: true, message: 'Recurring surveys processed successfully' });
  } catch (error) {
    console.error('Error processing recurring surveys:', error);
    res.status(500).json({ error: 'Failed to process recurring surveys' });
  }
});

// Send survey report via email
app.post('/api/compliance/runs/:runId/share-report', authenticateToken, async (req, res) => {
  try {
    const { runId } = req.params;
    const { email, message } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const report = await ComplianceService.generateSurveyReport(runId);
    
    // Generate HTML report
    const htmlReport = generateHtmlReport(report);
    
    // Send email with report using nodemailer directly
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'soxfort.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'no_reply@soxfort.com',
        pass: process.env.SMTP_PASS || '@Soxfort2000'
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER || 'no_reply@soxfort.com',
      to: email,
      subject: `Compliance Survey Report: ${report.run.title}`,
      html: `
        <h2>Compliance Survey Report</h2>
        <p><strong>Survey:</strong> ${report.run.title}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Completion Rate:</strong> ${report.statistics.completionRate}%</p>
        <p><strong>Total Responses:</strong> ${report.statistics.totalResponses}/${report.statistics.totalRecipients}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <hr>
        ${htmlReport}
      `
    });

    res.json({ success: true, message: 'Report sent successfully' });
  } catch (error) {
    console.error('Error sharing survey report:', error);
    res.status(500).json({ error: 'Failed to share survey report' });
  }
});

// Helper function to generate HTML report
function generateHtmlReport(report: any): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="color: #2563eb;">${report.run.title}</h1>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #374151;">Survey Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${report.statistics.completionRate}%</div>
            <div style="color: #6b7280;">Completion Rate</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${report.statistics.totalResponses}</div>
            <div style="color: #6b7280;">Total Responses</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${report.statistics.totalRecipients - report.statistics.totalResponses}</div>
            <div style="color: #6b7280;">Pending</div>
          </div>
          ${report.statistics.averageScore > 0 ? `
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">${report.statistics.averageScore}</div>
            <div style="color: #6b7280;">Average Score</div>
          </div>
          ` : ''}
        </div>
      </div>
  `;

  // Add individual responses
  if (report.responses.length > 0) {
    html += `<h2 style="color: #374151; margin-top: 30px;">Individual Responses</h2>`;
    
    report.responses.forEach((userResponse: any, index: number) => {
      html += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; padding: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">${userResponse.userName}</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">${userResponse.departmentName} • ${userResponse.userEmail}</p>
          <p style="color: #6b7280; font-size: 14px;">Submitted: ${new Date(userResponse.submittedAt).toLocaleDateString()}</p>
      `;

      userResponse.responses.forEach((response: any) => {
        html += `
          <div style="margin: 15px 0; padding: 15px; background: #f9fafb; border-radius: 6px;">
            <p style="font-weight: bold; color: #374151; margin-bottom: 8px;">${response.questionText}</p>
            <p style="color: #6b7280; margin-bottom: 5px;"><strong>Answer:</strong> ${response.answer || 'No answer provided'}</p>
            ${response.score !== null ? `<p style="color: #6b7280; margin-bottom: 5px;"><strong>Score:</strong> ${response.score}</p>` : ''}
            ${response.comment ? `<p style="color: #6b7280;"><strong>Comment:</strong> ${response.comment}</p>` : ''}
          </div>
        `;
      });

      html += `</div>`;
    });
  }

  html += `</div>`;
  return html;
}

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

// General Compliance API endpoints

// Create a new compliance record
app.post('/api/general-compliance', authenticateToken, async (req, res) => {
  try {
    const { name, description, complianceType, dueDate, dueDay, expiryDate, renewalDate, frequency, status, priority, assignedTo, departmentId } = req.body;
    const userId = req.user.userId;

    if (!name || !complianceType || !frequency) {
      return res.status(400).json({ error: 'Missing required fields: name, complianceType, frequency' });
    }

    // Validate date fields based on frequency
    if (['once', 'annually', 'biennially'].includes(frequency) && !dueDate) {
      return res.status(400).json({ error: 'Due date is required for one-time, annual, and biennial compliance items' });
    }

    if (['monthly', 'quarterly'].includes(frequency) && !dueDay) {
      return res.status(400).json({ error: 'Due day is required for monthly and quarterly compliance items' });
    }

    const { GeneralComplianceService } = await import('./generalComplianceService');
    const complianceRecord = await GeneralComplianceService.createComplianceRecord({
      name,
      description,
      complianceType,
      dueDate,
      dueDay,
      expiryDate,
      renewalDate,
      frequency,
      status,
      priority,
      assignedTo,
      departmentId,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: complianceRecord });
  } catch (error) {
    console.error('Error creating compliance record:', error);
    res.status(500).json({ error: 'Failed to create compliance record' });
  }
});

// Get all compliance records with optional filtering
app.get('/api/general-compliance', authenticateToken, async (req, res) => {
  try {
    const { status, priority, complianceType, assignedTo, departmentId, dueDateFrom, dueDateTo } = req.query;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (priority) filters.priority = priority as string;
    if (complianceType) filters.complianceType = complianceType as string;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (departmentId) filters.departmentId = departmentId as string;
    if (dueDateFrom) filters.dueDateFrom = dueDateFrom as string;
    if (dueDateTo) filters.dueDateTo = dueDateTo as string;

    const records = await GeneralComplianceService.getComplianceRecords(filters);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error getting compliance records:', error);
    res.status(500).json({ error: 'Failed to get compliance records' });
  }
});

// Get a single compliance record by ID
app.get('/api/general-compliance/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    
    const record = await GeneralComplianceService.getComplianceRecordById(id);
    
    if (!record) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error getting compliance record:', error);
    res.status(500).json({ error: 'Failed to get compliance record' });
  }
});

// Update a compliance record
app.put('/api/general-compliance/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, complianceType, dueDate, dueDay, expiryDate, renewalDate, frequency, status, priority, assignedTo, departmentId } = req.body;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    
    const updatedRecord = await GeneralComplianceService.updateComplianceRecord(id, {
      name,
      description,
      complianceType,
      dueDate,
      dueDay,
      expiryDate,
      renewalDate,
      frequency,
      status,
      priority,
      assignedTo,
      departmentId
    });

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Error updating compliance record:', error);
    res.status(500).json({ error: 'Failed to update compliance record' });
  }
});

// Delete a compliance record
app.delete('/api/general-compliance/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    
    const deleted = await GeneralComplianceService.deleteComplianceRecord(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ success: true, message: 'Compliance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting compliance record:', error);
    res.status(500).json({ error: 'Failed to delete compliance record' });
  }
});

// Get overdue compliance records
app.get('/api/general-compliance/overdue', authenticateToken, async (req, res) => {
  try {
    const { GeneralComplianceService } = await import('./generalComplianceService');
    const records = await GeneralComplianceService.getOverdueRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error getting overdue records:', error);
    res.status(500).json({ error: 'Failed to get overdue records' });
  }
});

// Get upcoming due records
app.get('/api/general-compliance/upcoming', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    const records = await GeneralComplianceService.getUpcomingDueRecords(Number(days));
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error getting upcoming records:', error);
    res.status(500).json({ error: 'Failed to get upcoming records' });
  }
});

// External Users API endpoints
app.post('/api/external-users', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, organization } = req.body;
    const { ExternalUserService } = await import('./externalUserService');
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const externalUser = await ExternalUserService.createExternalUser({
      name,
      email,
      phone,
      organization
    });

    res.status(201).json({ success: true, data: externalUser });
  } catch (error) {
    console.error('Error creating external user:', error);
    res.status(500).json({ error: 'Failed to create external user' });
  }
});

app.get('/api/external-users', authenticateToken, async (req, res) => {
  try {
    const { ExternalUserService } = await import('./externalUserService');
    const users = await ExternalUserService.getExternalUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting external users:', error);
    res.status(500).json({ error: 'Failed to get external users' });
  }
});

// Compliance Reminder Recipients API endpoints
app.post('/api/compliance-records/:id/recipients', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, externalUserId, email, name, role } = req.body;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const recipient = await ComplianceReminderService.addRecipient({
      complianceRecordId: id,
      userId,
      externalUserId,
      email,
      name,
      role
    });

    res.status(201).json({ success: true, data: recipient });
  } catch (error) {
    console.error('Error adding recipient:', error);
    res.status(500).json({ error: 'Failed to add recipient' });
  }
});

app.get('/api/compliance-records/:id/recipients', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    const recipients = await ComplianceReminderService.getRecipients(id);
    res.json({ success: true, data: recipients });
  } catch (error) {
    console.error('Error getting recipients:', error);
    res.status(500).json({ error: 'Failed to get recipients' });
  }
});

app.delete('/api/compliance-records/recipients/:recipientId', authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    const deleted = await ComplianceReminderService.removeRecipient(recipientId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    res.json({ success: true, message: 'Recipient removed successfully' });
  } catch (error) {
    console.error('Error removing recipient:', error);
    res.status(500).json({ error: 'Failed to remove recipient' });
  }
});

// Schedule reminders for a compliance record
app.post('/api/compliance-records/:id/schedule-reminders', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    await ComplianceReminderService.scheduleReminders(id);
    res.json({ success: true, message: 'Reminders scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    res.status(500).json({ error: 'Failed to schedule reminders' });
  }
});

// Compliance confirmation endpoint (public - no authentication required)
app.post('/api/compliance-confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { confirmedBy, confirmedEmail, confirmationType, notes } = req.body;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    if (!confirmedBy || !confirmedEmail || !confirmationType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const confirmed = await ComplianceReminderService.confirmCompliance(token, {
      confirmedBy,
      confirmedEmail,
      confirmationType,
      notes
    });

    if (confirmed) {
      res.json({ success: true, message: 'Compliance confirmed successfully' });
    } else {
      res.status(400).json({ error: 'Failed to confirm compliance' });
    }
  } catch (error) {
    console.error('Error confirming compliance:', error);
    res.status(500).json({ error: 'Failed to confirm compliance' });
  }
});

// Get confirmation details by token (public - no authentication required)
app.get('/api/compliance-confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { ComplianceReminderService } = await import('./complianceReminderService');
    
    const confirmation = await ComplianceReminderService.getConfirmationByToken(token);
    
    if (!confirmation) {
      return res.status(404).json({ error: 'Invalid or expired confirmation token' });
    }

    res.json({ success: true, data: confirmation });
  } catch (error) {
    console.error('Error getting confirmation details:', error);
    res.status(500).json({ error: 'Failed to get confirmation details' });
  }
});

// Manual trigger for reminder job (for testing)
app.post('/api/compliance-reminders/send', authenticateToken, async (req, res) => {
  try {
    const { ComplianceReminderJob } = await import('./complianceReminderJob');
    await ComplianceReminderJob.run();
    res.json({ success: true, message: 'Reminder emails sent successfully' });
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    res.status(500).json({ error: 'Failed to send reminder emails' });
  }
});

// Test endpoint without authentication (for development only)
app.post('/api/test/general-compliance', async (req, res) => {
  try {
    const { name, description, complianceType, dueDate, dueDay, expiryDate, renewalDate, frequency, status, priority, assignedTo, departmentId } = req.body;
    
    if (!name || !complianceType || !frequency) {
      return res.status(400).json({ error: 'Missing required fields: name, complianceType, frequency' });
    }

    // Validate date fields based on frequency
    if (['once', 'annually', 'biennially'].includes(frequency) && !dueDate) {
      return res.status(400).json({ error: 'Due date is required for one-time, annual, and biennial compliance items' });
    }

    if (['monthly', 'quarterly'].includes(frequency) && !dueDay) {
      return res.status(400).json({ error: 'Due day is required for monthly and quarterly compliance items' });
    }

    const { GeneralComplianceService } = await import('./generalComplianceService');
    const complianceRecord = await GeneralComplianceService.createComplianceRecord({
      name,
      description,
      complianceType,
      dueDate,
      dueDay,
      expiryDate,
      renewalDate,
      frequency,
      status,
      priority,
      assignedTo,
      departmentId,
      createdBy: '6863bcc8-6851-44ce-abaf-15f8429e6956' // Use existing user ID for testing
    });

    res.status(201).json({ success: true, data: complianceRecord });
  } catch (error) {
    console.error('Error creating compliance record:', error);
    res.status(500).json({ error: 'Failed to create compliance record' });
  }
});

app.get('/api/test/general-compliance', async (req, res) => {
  try {
    const { status, priority, complianceType, assignedTo, departmentId, dueDateFrom, dueDateTo } = req.query;
    const { GeneralComplianceService } = await import('./generalComplianceService');
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (priority) filters.priority = priority as string;
    if (complianceType) filters.complianceType = complianceType as string;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (departmentId) filters.departmentId = departmentId as string;
    if (dueDateFrom) filters.dueDateFrom = dueDateFrom as string;
    if (dueDateTo) filters.dueDateTo = dueDateTo as string;

    const records = await GeneralComplianceService.getComplianceRecords(filters);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error getting compliance records:', error);
    res.status(500).json({ error: 'Failed to get compliance records' });
  }
});

// Function to start recurring survey scheduler
async function startRecurringSurveyScheduler() {
  console.log('🕐 Starting recurring survey scheduler...');
  
  // Process recurring surveys every hour
  setInterval(async () => {
    try {
      const { RecurringComplianceService } = await import('./recurringComplianceService');
      await RecurringComplianceService.processRecurringSurveys();
    } catch (error) {
      console.error('Error in recurring survey scheduler:', error);
    }
  }, 60 * 60 * 1000); // Run every hour
  
  // Also run once on startup
  setTimeout(async () => {
    try {
      const { RecurringComplianceService } = await import('./recurringComplianceService');
      await RecurringComplianceService.processRecurringSurveys();
    } catch (error) {
      console.error('Error in initial recurring survey check:', error);
    }
  }, 5000); // Wait 5 seconds after startup
}

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
      
      // Start recurring survey scheduler
      startRecurringSurveyScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
