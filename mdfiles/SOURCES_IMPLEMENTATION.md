# Sources Implementation - Web Scraping Management

## Overview
The Sources feature (formerly "System Settings") provides comprehensive web scraping management for legal resources. It allows administrators to configure, manage, and monitor web scraping sources for various legal document types including case law, legislation, regulations, and government gazettes.

## ✅ Features Implemented

### 1. Source Management
- **Add Sources**: Configure new web scraping sources with custom CSS selectors
- **Edit Sources**: Modify existing source configurations
- **Delete Sources**: Remove sources from the system
- **Enable/Disable Sources**: Toggle sources on/off without deletion
- **Source Types**: Support for case law, legislation, regulations, and gazettes

### 2. Web Scraping Operations
- **Individual Scraping**: Scrape data from specific sources
- **Bulk Scraping**: Scrape all enabled sources simultaneously
- **Real-time Monitoring**: Track scraping job progress and status
- **Job Management**: View and monitor active scraping jobs
- **Error Handling**: Comprehensive error reporting and recovery

### 3. User Interface
- **Modern Design**: Clean, intuitive interface with consistent styling
- **Real-time Updates**: Live progress indicators and status updates
- **Responsive Layout**: Works on desktop and mobile devices
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🏗️ Technical Implementation

### Database Schema

#### scraping_sources Table
```sql
CREATE TABLE scraping_sources (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  source_type ENUM('case_law', 'legislation', 'regulation', 'gazette') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  selectors JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_source_type (source_type),
  INDEX idx_is_active (is_active)
)
```

### Frontend Components

#### SourcesSettings Component (`src/pages/Settings.tsx`)
- **State Management**: React hooks for managing sources and scraping jobs
- **API Integration**: Full integration with scraping service
- **Real-time Updates**: Polling for job status updates
- **Error Handling**: Toast notifications for user feedback

#### Key Features:
- Source list with enable/disable toggles
- Individual and bulk scraping controls
- Active job monitoring with progress bars
- Source configuration modal with CSS selector inputs
- Real-time status updates and notifications

### Backend API Endpoints

#### Source Management
- `GET /api/scraping-sources` - Get all sources
- `GET /api/scraping-sources/:id` - Get specific source
- `POST /api/scraping-sources` - Create new source
- `PUT /api/scraping-sources/:id` - Update source
- `DELETE /api/scraping-sources/:id` - Delete source

#### Scraping Operations
- `POST /api/scrape` - Initiate scraping job
- `GET /api/scrape/status/:jobId` - Get job status
- `GET /api/scraped-data` - Get scraped data with filtering
- `GET /api/scraped-data/stats` - Get scraping statistics

## 🚀 How to Use

### 1. Accessing Sources
1. Navigate to **Settings** in the main menu
2. Click on **Sources** in the sidebar
3. You'll see the Sources management interface

### 2. Adding a New Source
1. Click **"Add Source"** button
2. Fill in the required information:
   - **Name**: Descriptive name for the source
   - **URL**: Base URL of the website to scrape
   - **Type**: Select the appropriate legal resource type
   - **CSS Selectors**: Configure selectors for data extraction
3. Click **"Add Source"** to save

### 3. Configuring CSS Selectors
CSS selectors help the system extract specific content from websites:

#### Required Selectors:
- **Title Selector**: Extracts the document title
  - Examples: `.title`, `h1`, `.judgment-title`
- **Content Selector**: Extracts the main content
  - Examples: `.content`, `.body`, `.judgment-body`

#### Optional Selectors:
- **Date Selector**: Extracts publication date
  - Examples: `.date`, `.published-date`, `.judgment-date`
- **Reference Selector**: Extracts reference numbers
  - Examples: `.reference`, `.citation`, `.case-number`

### 4. Running Scraping Jobs

#### Individual Scraping:
1. Find the source in the list
2. Click the **"Scrape"** button next to the source
3. Monitor the job progress in the "Active Scraping Jobs" section

#### Bulk Scraping:
1. Click **"Scrape All Enabled"** button
2. The system will start scraping all enabled sources
3. Monitor progress for all jobs simultaneously

### 5. Monitoring Jobs
- **Active Jobs**: View all running scraping jobs
- **Progress Bars**: Real-time progress indicators
- **Status Icons**: Visual status indicators (queued, in progress, completed, failed)
- **Error Messages**: Detailed error information for failed jobs

## 📊 Default Sources

The system comes pre-configured with these default sources:

### Case Law Sources
- **SAFLII - Constitutional Court**: Constitutional Court judgments
- **SAFLII - Supreme Court of Appeal**: Supreme Court of Appeal judgments
- **SAFLII - High Courts**: High Court judgments
- **Department of Justice - Case Law**: Official case law database

### Legislation Sources
- **Government Legislation Portal**: Official government acts
- **Department of Justice - Legislation**: Justice department legislation

### Regulation Sources
- **Government Regulations Portal**: Official government regulations

### Gazette Sources
- **Government Gazette**: Official government gazettes

## 🔧 Configuration

### Environment Variables
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=prolegal_db
DB_PORT=3306

# Backend API
PORT=3000
```

### Seeding Default Sources
```bash
# Run the seed script to add default sources
cd backend
node seed-scraping-sources.js
```

## 🎯 Best Practices

### 1. CSS Selector Configuration
- **Use Specific Selectors**: Avoid generic selectors like `div` or `p`
- **Test Selectors**: Use browser developer tools to verify selectors
- **Handle Variations**: Include multiple selector options for robustness
- **Avoid Fragile Selectors**: Don't rely on IDs that might change

### 2. Source Management
- **Descriptive Names**: Use clear, descriptive names for sources
- **Regular Updates**: Keep source URLs and selectors up to date
- **Monitor Performance**: Watch for failed jobs and adjust configurations
- **Backup Configurations**: Keep backups of working configurations

### 3. Scraping Operations
- **Respect Rate Limits**: Don't overwhelm target websites
- **Monitor Jobs**: Keep an eye on job status and errors
- **Schedule Regular Scraping**: Set up periodic scraping for fresh data
- **Handle Errors Gracefully**: Implement proper error handling and recovery

## 🐛 Troubleshooting

### Common Issues

#### 1. Scraping Jobs Fail
- **Check Source URL**: Verify the URL is accessible
- **Validate Selectors**: Ensure CSS selectors are correct
- **Check Network**: Verify backend connectivity
- **Review Logs**: Check backend logs for detailed error messages

#### 2. No Data Extracted
- **Verify Selectors**: Use browser developer tools to test selectors
- **Check Website Structure**: Websites may have changed their structure
- **Test Manually**: Try accessing the source URL directly

#### 3. Performance Issues
- **Limit Concurrent Jobs**: Don't run too many jobs simultaneously
- **Monitor Database**: Check database performance and storage
- **Optimize Selectors**: Use more efficient CSS selectors

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

## 🔮 Future Enhancements

### Planned Features
1. **Automated Scheduling**: Set up periodic scraping jobs
2. **Advanced Filtering**: More sophisticated data filtering options
3. **Export Functionality**: Export scraped data in various formats
4. **Analytics Dashboard**: Detailed scraping analytics and insights
5. **Webhook Integration**: Notifications for completed jobs
6. **Content Validation**: Automatic validation of scraped content
7. **Duplicate Detection**: Identify and handle duplicate content
8. **API Rate Limiting**: Intelligent rate limiting for external APIs

### Technical Improvements
1. **Caching Layer**: Implement Redis caching for better performance
2. **Queue Management**: Advanced job queue management
3. **Distributed Scraping**: Support for distributed scraping across multiple servers
4. **Content Processing**: AI-powered content analysis and categorization
5. **Real-time Updates**: WebSocket support for live updates

## 📝 Notes

- The system is designed to be respectful of target websites
- Implement proper rate limiting to avoid overwhelming sources
- Regular maintenance of source configurations is recommended
- Monitor database size and implement archival strategies
- Consider legal and ethical implications of web scraping
- Always respect robots.txt and website terms of service

The Sources feature provides a powerful and flexible foundation for managing web scraping operations across multiple legal resource types, with comprehensive monitoring and management capabilities.
