const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupTestData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'prolegal_db'
  });

  try {
    console.log('🔧 Setting up test data for contract expiry notifications...');

    // 1. Create Legal Department
    const legalDeptId = 'legal-dept-001';
    await connection.execute(`
      INSERT INTO departments (id, name, description, email, status) 
      VALUES (?, 'Legal Department', 'Legal team for contract management', 'legal@company.com', 'active')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [legalDeptId]);
    console.log('✅ Legal Department created/updated');

    // 2. Create test users for Legal Department
    const legalUsers = [
      {
        id: 'legal-user-001',
        email: 'mortonmab@gmail.com',
        full_name: 'Legal Manager',
        role: 'attorney'
      },
      {
        id: 'legal-user-002', 
        email: 'mortonmab@live.com',
        full_name: 'Legal Assistant',
        role: 'paralegal'
      }
    ];

    for (const user of legalUsers) {
      // Create user
      await connection.execute(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified)
        VALUES (?, ?, ?, ?, ?, 'active', TRUE)
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
      `, [user.id, user.email, 'test-password-hash', user.full_name, user.role]);

      // Assign to Legal Department
      await connection.execute(`
        INSERT INTO user_departments (id, user_id, department_id, is_primary)
        VALUES (UUID(), ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE is_primary = TRUE
      `, [user.id, legalDeptId]);
    }
    console.log('✅ Legal Department users created/updated');

    // 3. Create IT Department and Head
    const itDeptId = 'it-dept-001';
    const itHeadId = 'it-head-001';
    
    // Create IT Department Head
    await connection.execute(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified)
      VALUES (?, ?, ?, ?, 'staff', 'active', TRUE)
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
    `, [itHeadId, 'hello@soxfort.com', 'test-password-hash', 'IT Department Head']);

    // Create IT Department
    await connection.execute(`
      INSERT INTO departments (id, name, description, head_user_id, email, status)
      VALUES (?, 'IT Department', 'Information Technology Department', ?, 'it@company.com', 'active')
      ON DUPLICATE KEY UPDATE head_user_id = VALUES(head_user_id)
    `, [itDeptId, itHeadId]);
    console.log('✅ IT Department and Head created/updated');

    // 4. Update existing contract to have IT Department
    const [contracts] = await connection.execute('SELECT id FROM contracts LIMIT 1');
    if (contracts.length > 0) {
      await connection.execute(`
        UPDATE contracts SET department_id = ? WHERE id = ?
      `, [itDeptId, contracts[0].id]);
      console.log('✅ Updated existing contract with IT Department');
    }

    console.log('🎉 Test data setup completed!');
    console.log('\n📧 Test Email Addresses:');
    console.log('   - Legal Manager: mortonmab@gmail.com');
    console.log('   - Legal Assistant: mortonmab@live.com');
    console.log('   - IT Department Head: hello@soxfort.com');
    console.log('\n💡 To test notifications, run: curl -X POST http://localhost:3000/api/contracts/check-expiry');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await connection.end();
  }
}

setupTestData();
