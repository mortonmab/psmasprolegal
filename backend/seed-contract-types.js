const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prolegal_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

// Contract types data
const contractTypes = [
  // 1. Commercial / Business Contracts
  {
    name: 'Supply Agreements',
    description: 'Govern the purchase or supply of goods and services.',
    color: '#3B82F6'
  },
  {
    name: 'Service Agreements',
    description: 'Outline terms under which services are provided.',
    color: '#10B981'
  },
  {
    name: 'Sales Contracts',
    description: 'Cover sale of products or assets between parties.',
    color: '#F59E0B'
  },
  {
    name: 'Distribution Agreements',
    description: 'Allow third parties to distribute a company\'s products.',
    color: '#8B5CF6'
  },
  {
    name: 'Franchise Agreements',
    description: 'Regulate rights to operate under a brand.',
    color: '#EF4444'
  },

  // 2. Employment & HR Contracts
  {
    name: 'Employment Contracts',
    description: 'Define terms of employment, duties, pay, and benefits.',
    color: '#06B6D4'
  },
  {
    name: 'Consultancy Agreements',
    description: 'Engagement of external specialists or independent contractors.',
    color: '#84CC16'
  },
  {
    name: 'Non-Disclosure Agreements (NDAs)',
    description: 'Protect confidential company information.',
    color: '#F97316'
  },
  {
    name: 'Severance Agreements',
    description: 'Outline exit terms for departing employees.',
    color: '#EC4899'
  },

  // 3. Corporate & Governance Contracts
  {
    name: 'Shareholders\' Agreements',
    description: 'Govern relations between company owners.',
    color: '#6366F1'
  },
  {
    name: 'Joint Venture Agreements',
    description: 'Regulate partnerships between companies.',
    color: '#14B8A6'
  },
  {
    name: 'Investment Agreements',
    description: 'Terms for investors contributing capital.',
    color: '#F43F5E'
  },
  {
    name: 'Memoranda of Understanding (MOUs)',
    description: 'Non-binding outline of cooperation terms.',
    color: '#A855F7'
  },

  // 4. Intellectual Property (IP) Contracts
  {
    name: 'Licensing Agreements',
    description: 'Grant rights to use IP (software, patents, trademarks).',
    color: '#22C55E'
  },
  {
    name: 'Assignment Agreements',
    description: 'Transfer ownership of IP.',
    color: '#EAB308'
  },
  {
    name: 'Research & Development (R&D) Agreements',
    description: 'Govern co-development of products or technology.',
    color: '#0EA5E9'
  },

  // 5. Real Estate & Property Contracts
  {
    name: 'Lease Agreements',
    description: 'Regulate rental of office or operational premises.',
    color: '#7C3AED'
  },
  {
    name: 'Property Purchase Agreements',
    description: 'Cover acquisition of property.',
    color: '#059669'
  },
  {
    name: 'Facility Management Agreements',
    description: 'Services for upkeep of premises.',
    color: '#DC2626'
  },

  // 6. Financial & Procurement Contracts
  {
    name: 'Loan Agreements',
    description: 'Define borrowing terms with lenders.',
    color: '#0891B2'
  },
  {
    name: 'Procurement Agreements',
    description: 'Terms for purchasing goods/services from vendors.',
    color: '#65A30D'
  },
  {
    name: 'Guarantees & Security Agreements',
    description: 'Collateral or assurances in financing deals.',
    color: '#BE185D'
  },

  // 7. Technology & Data Contracts
  {
    name: 'SaaS Agreements',
    description: 'Cloud-based software licensing.',
    color: '#2563EB'
  },
  {
    name: 'IT Services Agreements',
    description: 'Outsourcing or managed services.',
    color: '#16A34A'
  },
  {
    name: 'Data Processing Agreements (DPAs)',
    description: 'Compliance with data protection laws (e.g., GDPR).',
    color: '#D97706'
  },

  // 8. Regulatory & Compliance Contracts
  {
    name: 'Government Contracts',
    description: 'Agreements with public sector bodies.',
    color: '#9333EA'
  },
  {
    name: 'Compliance Undertakings',
    description: 'Commitments to meet industry or legal standards.',
    color: '#EA580C'
  },
  {
    name: 'Regulatory Settlement Agreements',
    description: 'Terms for resolving investigations.',
    color: '#DB2777'
  }
];

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function seedContractTypes() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Database connected successfully');
    console.log('🌱 Starting to seed contract types...');
    
    // Check if contract_types table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'contract_types'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Contract types table does not exist. Please run the database initialization first.');
      return;
    }
    
    // Clear existing contract types (optional - comment out if you want to keep existing)
    console.log('🧹 Clearing existing contract types...');
    await connection.execute('DELETE FROM contract_types');
    
    // Insert contract types
    console.log('📝 Inserting contract types...');
    
    for (const contractType of contractTypes) {
      const id = generateUUID();
      
      await connection.execute(
        'INSERT INTO contract_types (id, name, description, color, is_active) VALUES (?, ?, ?, ?, ?)',
        [id, contractType.name, contractType.description, contractType.color, true]
      );
      
      console.log(`✅ Added: ${contractType.name}`);
    }
    
    console.log(`🎉 Successfully seeded ${contractTypes.length} contract types!`);
    
    // Verify the data
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM contract_types');
    console.log(`📊 Total contract types in database: ${rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding contract types:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seeding function
seedContractTypes();
