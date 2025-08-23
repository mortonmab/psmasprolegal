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

const initialSources = [
  {
    name: 'Southern African Legal Information Institute (SAFLII)',
    url: 'http://www.saflii.org',
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
      title: '.legislation-title, h1, .title',
      content: '.legislation-content, .content, .body',
      date: '.publication-date, .date, .enacted-date'
    }
  },
  {
    name: 'Government Regulations Portal',
    url: 'https://www.gov.za/documents/regulations',
    source_type: 'regulation',
    selectors: {
      title: '.regulation-title, h1, .title',
      content: '.regulation-content, .content, .body',
      date: '.publication-date, .date, .enacted-date'
    }
  },
  {
    name: 'Government Gazette',
    url: 'https://www.gov.za/documents/government-gazette',
    source_type: 'gazette',
    selectors: {
      title: '.gazette-title, h1, .title',
      content: '.gazette-content, .content, .body',
      date: '.gazette-date, .date, .publication-date',
      reference: '.gazette-number, .reference, .gazette-ref'
    }
  },
  {
    name: 'Constitutional Court of South Africa',
    url: 'https://www.concourt.org.za/index.php/judgment',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-content, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.case-number, .citation, .reference'
    }
  },
  {
    name: 'Supreme Court of Appeal',
    url: 'https://www.supremecourtofappeal.org.za/judgments',
    source_type: 'case_law',
    selectors: {
      title: '.judgment-title, h1, .title',
      content: '.judgment-content, .content, .body',
      date: '.judgment-date, .date, .published-date',
      reference: '.case-number, .citation, .reference'
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
      console.log('Scraping sources already exist. Skipping seeding.');
      return;
    }
    
    console.log('Seeding scraping sources...');
    
    for (const source of initialSources) {
      const id = crypto.randomUUID();
      
      await connection.execute(
        'INSERT INTO scraping_sources (id, name, url, source_type, selectors, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          source.name,
          source.url,
          source.source_type,
          JSON.stringify(source.selectors),
          true
        ]
      );
      
      console.log(`✓ Added source: ${source.name}`);
    }
    
    console.log('Scraping sources seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding scraping sources:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seeding function
if (require.main === module) {
  seedScrapingSources()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedScrapingSources };
