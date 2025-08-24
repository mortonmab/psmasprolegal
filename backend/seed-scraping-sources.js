const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prolegal_db',
  port: process.env.DB_PORT || 3306
};

// Default scraping sources
const defaultSources = [
  // Veritas Zimbabwe Court Sources
  {
    name: 'Veritas Zimbabwe - Constitutional Court',
    url: 'https://www.veritaszim.net/constitutional-court',
    source_type: 'case_law',
    selectors: {
      title: 'h1, .page-title, .judgment-title, .case-title',
      content: '.content, .judgment-content, .case-content, .entry-content, main',
      date: '.date, .published-date, .judgment-date, .case-date, time',
      reference: '.reference, .case-number, .citation, .judgment-reference, .file-number'
    }
  },
  {
    name: 'Veritas Zimbabwe - Supreme Court',
    url: 'https://www.veritaszim.net/supreme-court',
    source_type: 'case_law',
    selectors: {
      title: 'h1, .page-title, .judgment-title, .case-title',
      content: '.content, .judgment-content, .case-content, .entry-content, main',
      date: '.date, .published-date, .judgment-date, .case-date, time',
      reference: '.reference, .case-number, .citation, .judgment-reference, .file-number'
    }
  },
  {
    name: 'Veritas Zimbabwe - High Court',
    url: 'https://www.veritaszim.net/high-court',
    source_type: 'case_law',
    selectors: {
      title: 'h1, .page-title, .judgment-title, .case-title',
      content: '.content, .judgment-content, .case-content, .entry-content, main',
      date: '.date, .published-date, .judgment-date, .case-date, time',
      reference: '.reference, .case-number, .citation, .judgment-reference, .file-number'
    }
  },
  {
    name: 'Veritas Zimbabwe - Electoral Court',
    url: 'https://www.veritaszim.net/electoral-court',
    source_type: 'case_law',
    selectors: {
      title: 'h1, .page-title, .judgment-title, .case-title',
      content: '.content, .judgment-content, .case-content, .entry-content, main',
      date: '.date, .published-date, .judgment-date, .case-date, time',
      reference: '.reference, .case-number, .citation, .judgment-reference, .file-number'
    }
  },
  {
    name: 'Veritas Zimbabwe - Labour Court',
    url: 'https://www.veritaszim.net/labour-court',
    source_type: 'case_law',
    selectors: {
      title: 'h1, .page-title, .judgment-title, .case-title',
      content: '.content, .judgment-content, .case-content, .entry-content, main',
      date: '.date, .published-date, .judgment-date, .case-date, time',
      reference: '.reference, .case-number, .citation, .judgment-reference, .file-number'
    }
  },
  // Existing sources
  {
    name: 'SAFLII - Constitutional Court',
    url: 'https://www.saflii.org/za/cases/ZACC/',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-body, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.judgment-reference, .citation, .case-number'
    }
  },
  {
    name: 'SAFLII - Supreme Court of Appeal',
    url: 'https://www.saflii.org/za/cases/ZASCA/',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-body, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.judgment-reference, .citation, .case-number'
    }
  },
  {
    name: 'SAFLII - High Courts',
    url: 'https://www.saflii.org/za/cases/ZAGPJHC/',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-body, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.judgment-reference, .citation, .case-number'
    }
  },
  {
    name: 'Government Legislation Portal',
    url: 'https://www.gov.za/documents/acts',
    source_type: 'legislation',
    selectors: {
      title: '.act-title, h1, .title',
      content: '.act-content, .content, .body',
      date: '.act-date, .date, .published-date',
      reference: '.act-number, .reference, .citation'
    }
  },
  {
    name: 'Government Regulations Portal',
    url: 'https://www.gov.za/documents/regulations',
    source_type: 'regulation',
    selectors: {
      title: '.regulation-title, h1, .title',
      content: '.regulation-content, .content, .body',
      date: '.regulation-date, .date, .published-date',
      reference: '.regulation-number, .reference, .citation'
    }
  },
  {
    name: 'Government Gazette',
    url: 'https://www.gov.za/documents/gazettes',
    source_type: 'gazette',
    selectors: {
      title: '.gazette-title, h1, .title',
      content: '.gazette-content, .content, .body',
      date: '.gazette-date, .date, .published-date',
      reference: '.gazette-number, .reference, .citation'
    }
  },
  {
    name: 'Department of Justice - Case Law',
    url: 'https://www.justice.gov.za/courts/judgments/',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-body, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.judgment-reference, .citation, .case-number'
    }
  },
  {
    name: 'Department of Justice - Legislation',
    url: 'https://www.justice.gov.za/legislation/',
    source_type: 'legislation',
    selectors: {
      title: '.legislation-title, h1, .title',
      content: '.legislation-content, .content, .body',
      date: '.legislation-date, .date, .published-date',
      reference: '.legislation-number, .reference, .citation'
    }
  }
];

async function seedScrapingSources() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to database successfully');
    
    // Check if sources already exist
    const [existingSources] = await connection.execute(
      'SELECT COUNT(*) as count FROM scraping_sources'
    );
    
    if (existingSources[0].count > 0) {
      console.log('Scraping sources already exist. Skipping seed...');
      return;
    }
    
    console.log('Seeding scraping sources...');
    
    for (const source of defaultSources) {
      const id = crypto.randomUUID();
      
      await connection.execute(
        'INSERT INTO scraping_sources (id, name, url, source_type, is_active, selectors) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          source.name,
          source.url,
          source.source_type,
          true, // is_active
          JSON.stringify(source.selectors)
        ]
      );
      
      console.log(`✓ Added source: ${source.name}`);
    }
    
    console.log('✅ Scraping sources seeded successfully!');
    console.log(`Added ${defaultSources.length} default sources`);
    
  } catch (error) {
    console.error('❌ Error seeding scraping sources:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedScrapingSources()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedScrapingSources };
