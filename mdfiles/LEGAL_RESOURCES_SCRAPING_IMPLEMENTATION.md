# Legal Resources Scraping System Implementation

## Overview
The legal resources section has been enhanced with a comprehensive web scraping and indexing system that allows users to search across multiple legal sources including case law, legislation, regulations, and government gazettes.

## ✅ What's Been Implemented

### 1. Backend API Endpoints

#### Scraping Sources Management
- `GET /api/scraping-sources` - Get all scraping sources
- `GET /api/scraping-sources/:id` - Get specific source
- `POST /api/scraping-sources` - Create new source
- `PUT /api/scraping-sources/:id` - Update source
- `DELETE /api/scraping-sources/:id` - Delete source

#### Scraped Data Retrieval
- `GET /api/scraped-data` - Search and filter scraped data with pagination
- `GET /api/scraped-data/:id` - Get specific scraped item
- `GET /api/scraped-data/stats` - Get statistics about scraped data

#### Web Scraping Operations
- `POST /api/scrape` - Initiate web scraping job
- `GET /api/scrape/status/:jobId` - Check scraping job status

### 2. Database Schema

#### scraped_data Table
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
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_title (title),
  INDEX idx_source_type (source_type),
  INDEX idx_date_published (date_published),
  INDEX idx_jurisdiction (jurisdiction),
  INDEX idx_scraped_at (scraped_at)
)
```

#### scraping_sources Table
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
)
```

### 3. Frontend Services

#### Updated scrapingService.ts
- API-based source management (CRUD operations)
- Real-time data retrieval with search and filtering
- Web scraping job management
- Statistics and analytics

### 4. Settings Integration

#### Scraping Sources Configuration
- Complete CRUD interface for managing scraping sources
- Real-time source enable/disable functionality
- Source type categorization
- CSS selector configuration for each source

### 5. Legal Resources Page

#### Enhanced Search Functionality
- Real-time search across all scraped data
- Debounced search with API integration
- Search result display with source links
- Type-based filtering and categorization

#### Resource Cards
- Individual cards for each legal resource type
- "Update Database" buttons for manual scraping
- Real-time crawl status indicators
- Progress tracking for scraping operations

## 🔧 How to Use the System

### 1. Configure Scraping Sources

1. Navigate to **Settings → System Settings**
2. Click **"Add Source"** to configure a new legal source
3. Fill in the required information:
   - **Name**: Descriptive name for the source
   - **URL**: Base URL of the legal website
   - **Type**: Case Law, Legislation, Regulation, or Gazette
   - **Selectors**: CSS selectors for extracting data
     - Title Selector: `.judgment-title, h1, .title`
     - Content Selector: `.judgment-body, .content, .body`
     - Date Selector: `.judgment-date, .date, .published-date`
     - Reference Selector: `.judgment-reference, .citation, .case-number`

### 2. Run Web Scraping

1. Go to **Legal Resources** page
2. Click **"Update Database"** on any resource card
3. Monitor the progress indicator
4. Wait for completion notification

### 3. Search Legal Resources

1. Use the search bar on the Legal Resources page
2. Results will show from all indexed sources
3. Click on results to view details
4. Use "View Source" links to access original content

## 📋 Pre-configured Sources

The system comes with these default sources:

### Case Law Sources
- Southern African Legal Information Institute (SAFLII)
- Constitutional Court of South Africa
- Supreme Court of Appeal

### Legislation Sources
- Government Legislation Portal

### Regulation Sources
- Government Regulations Portal

### Gazette Sources
- Government Gazette

## 🚀 Running the System

### 1. Start the Backend
```bash
cd backend
npm install
npm start
```

### 2. Seed Initial Sources
```bash
cd backend
node seed-scraping-sources.js
```

### 3. Start the Frontend
```bash
npm install
npm run dev
```

## 🔍 Search and Filtering

### Search Parameters
- **search**: Text search across title, content, and keywords
- **source_type**: Filter by legal resource type
- **jurisdiction**: Filter by jurisdiction
- **page**: Pagination page number
- **limit**: Results per page
- **sort_by**: Sort field (title, date_published, scraped_at)
- **sort_order**: Sort direction (asc, desc)

### Example API Calls
```javascript
// Search for corporate law cases
const response = await scrapingService.getScrapedData({
  search: 'corporate law',
  source_type: 'case_law',
  page: 1,
  limit: 20
});

// Get recent legislation
const response = await scrapingService.getScrapedData({
  source_type: 'legislation',
  sort_by: 'date_published',
  sort_order: 'desc',
  limit: 10
});
```

## 📊 Data Structure

### Scraped Data Format
```typescript
interface ScrapedData {
  id: string;
  title: string;
  content: string;
  source_type: 'case_law' | 'legislation' | 'regulation' | 'gazette';
  source_url: string;
  source_name?: string;
  date_published?: string;
  reference_number?: string;
  jurisdiction?: string;
  keywords?: string;
  scraped_at: string;
}
```

### Search Result Format
```typescript
interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'legislation' | 'regulation' | 'gazette';
  description: string;
  link: string;
  date: string;
  tags: string[];
  source_url?: string;
}
```

## 🔧 Technical Implementation

### Web Scraping Process
1. **Job Creation**: Scraping requests are queued as background jobs
2. **Browser Automation**: Uses Puppeteer (Chromium) for web scraping
3. **Data Extraction**: Applies CSS selectors to extract structured data
4. **Database Storage**: Stores extracted data with metadata
5. **Progress Tracking**: Real-time progress updates via WebSocket-like polling

### Error Handling
- Connection timeout handling
- Invalid selector error recovery
- Source availability checking
- Graceful degradation for failed sources

### Performance Optimizations
- Debounced search (300ms delay)
- Pagination for large result sets
- Indexed database queries
- Background job processing

## 🎯 Next Steps

### Immediate Improvements Needed
1. **Individual Resource Pages**: Update CaseLaw, Legislation, Regulations, and Gazettes pages to use real scraped data
2. **Advanced Filtering**: Add date range, jurisdiction, and court-specific filters
3. **Export Functionality**: Add PDF/CSV export for search results
4. **User Preferences**: Save user search preferences and filters

### Future Enhancements
1. **Automated Scheduling**: Set up periodic scraping jobs
2. **Content Analysis**: AI-powered content summarization and tagging
3. **Citation Linking**: Automatic linking between related cases and legislation
4. **User Annotations**: Allow users to add notes and bookmarks
5. **Advanced Search**: Full-text search with boolean operators

## 🐛 Troubleshooting

### Common Issues
1. **No Sources Configured**: Add sources in Settings → System Settings
2. **Scraping Fails**: Check source URLs and CSS selectors
3. **No Search Results**: Ensure scraping has been run for the desired sources
4. **Database Connection**: Verify MySQL connection settings

### Debug Commands
```bash
# Check scraping sources
curl http://localhost:3000/api/scraping-sources

# Check scraped data stats
curl http://localhost:3000/api/scraped-data/stats

# Test scraping endpoint
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"source": {...}, "searchParams": {}}'
```

## 📝 Notes

- The system is designed to be extensible for additional legal sources
- CSS selectors may need adjustment based on website structure changes
- Consider rate limiting and robots.txt compliance for production use
- Regular maintenance of scraping sources is recommended
- Monitor database size and implement archival strategies for long-term use
