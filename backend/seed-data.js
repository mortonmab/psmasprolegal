import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'prolegal_db',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function seedDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🌱 Seeding database with sample data...');
    
    // Create sample users
    const users = [
      {
        id: generateUUID(),
        email: 'admin@prolegal.com',
        password_hash: '$2b$10$dummy.hash.for.testing',
        full_name: 'Admin User',
        role: 'admin',
        phone: '+1234567890'
      },
      {
        id: generateUUID(),
        email: 'attorney@prolegal.com',
        password_hash: '$2b$10$dummy.hash.for.testing',
        full_name: 'John Smith',
        role: 'attorney',
        phone: '+1234567891'
      },
      {
        id: generateUUID(),
        email: 'paralegal@prolegal.com',
        password_hash: '$2b$10$dummy.hash.for.testing',
        full_name: 'Sarah Johnson',
        role: 'paralegal',
        phone: '+1234567892'
      }
    ];

    for (const user of users) {
      await connection.execute(
        'INSERT INTO users (id, email, password_hash, full_name, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.email, user.password_hash, user.full_name, user.role, user.phone, 'active']
      );
    }
    console.log('✅ Created 3 users');

    // Create sample departments
    const departments = [
      {
        id: generateUUID(),
        name: 'Legal Department',
        description: 'Main legal practice department',
        email: 'legal@prolegal.com',
        phone: '+1234567893'
      },
      {
        id: generateUUID(),
        name: 'Corporate Law',
        description: 'Corporate and business law practice',
        email: 'corporate@prolegal.com',
        phone: '+1234567894'
      },
      {
        id: generateUUID(),
        name: 'Family Law',
        description: 'Family and domestic relations practice',
        email: 'family@prolegal.com',
        phone: '+1234567895'
      }
    ];

    for (const dept of departments) {
      await connection.execute(
        'INSERT INTO departments (id, name, description, email, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
        [dept.id, dept.name, dept.description, dept.email, dept.phone, 'active']
      );
    }
    console.log('✅ Created 3 departments');

    // Create sample cases
    const cases = [
      {
        id: generateUUID(),
        case_number: 'CASE-2024-001',
        case_name: 'Smith vs. Johnson - Contract Dispute',
        description: 'Breach of contract case involving software development services',
        case_type: 'civil',
        status: 'open',
        priority: 'high',
        filing_date: '2024-01-15',
        court_name: 'Superior Court',
        court_case_number: 'SC-2024-001'
      },
      {
        id: generateUUID(),
        case_number: 'CASE-2024-002',
        case_name: 'Brown Family Estate',
        description: 'Estate planning and probate case',
        case_type: 'family',
        status: 'pending',
        priority: 'medium',
        filing_date: '2024-02-01',
        court_name: 'Probate Court',
        court_case_number: 'PC-2024-002'
      },
      {
        id: generateUUID(),
        case_number: 'CASE-2024-003',
        case_name: 'TechCorp Employment Dispute',
        description: 'Wrongful termination and discrimination case',
        case_type: 'employment',
        status: 'open',
        priority: 'high',
        filing_date: '2024-02-15',
        court_name: 'Employment Tribunal',
        court_case_number: 'ET-2024-003'
      }
    ];

    for (const caseItem of cases) {
      await connection.execute(
        'INSERT INTO cases (id, case_number, case_name, description, case_type, status, priority, filing_date, court_name, court_case_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [caseItem.id, caseItem.case_number, caseItem.case_name, caseItem.description, caseItem.case_type, caseItem.status, caseItem.priority, caseItem.filing_date, caseItem.court_name, caseItem.court_case_number]
      );
    }
    console.log('✅ Created 3 cases');

    // Create sample vendors
    const vendors = [
      {
        id: generateUUID(),
        name: 'Legal Research Services Inc.',
        company_type: 'corporation',
        address: '123 Research Ave, Suite 100',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        contact_person: 'Jane Doe',
        email: 'contact@legalresearch.com',
        phone: '+1234567896',
        website: 'https://legalresearch.com'
      },
      {
        id: generateUUID(),
        name: 'Court Reporting Solutions',
        company_type: 'corporation',
        address: '456 Court St',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postal_code: '90210',
        contact_person: 'Mike Wilson',
        email: 'info@courtreporting.com',
        phone: '+1234567897',
        website: 'https://courtreporting.com'
      }
    ];

    for (const vendor of vendors) {
      await connection.execute(
        'INSERT INTO vendors (id, name, company_type, address, city, state, country, postal_code, contact_person, email, phone, website, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [vendor.id, vendor.name, vendor.company_type, vendor.address, vendor.city, vendor.state, vendor.country, vendor.postal_code, vendor.contact_person, vendor.email, vendor.phone, vendor.website, 'active']
      );
    }
    console.log('✅ Created 2 vendors');

    // Create sample tasks
    const tasks = [
      {
        id: generateUUID(),
        title: 'Review Contract Documents',
        description: 'Review and analyze contract documents for Smith vs. Johnson case',
        task_type: 'case_related',
        priority: 'high',
        due_date: '2024-03-25',
        assigned_to: users[1].id, // attorney
        assigned_by: users[0].id, // admin
        case_id: cases[0].id
      },
      {
        id: generateUUID(),
        title: 'Prepare Estate Documents',
        description: 'Prepare estate planning documents for Brown family',
        task_type: 'case_related',
        priority: 'medium',
        due_date: '2024-03-30',
        assigned_to: users[2].id, // paralegal
        assigned_by: users[1].id, // attorney
        case_id: cases[1].id
      }
    ];

    for (const task of tasks) {
      await connection.execute(
        'INSERT INTO tasks (id, title, description, task_type, priority, due_date, assigned_to, assigned_by, case_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [task.id, task.title, task.description, task.task_type, task.priority, task.due_date, task.assigned_to, task.assigned_by, task.case_id, 'pending']
      );
    }
    console.log('✅ Created 2 tasks');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Sample data created:');
    console.log('- 3 Users (Admin, Attorney, Paralegal)');
    console.log('- 3 Departments (Legal, Corporate, Family)');
    console.log('- 3 Cases (Contract Dispute, Estate, Employment)');
    console.log('- 2 Vendors (Research Services, Court Reporting)');
    console.log('- 2 Tasks (Contract Review, Estate Documents)');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await connection.end();
  }
}

seedDatabase();
