const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTestContracts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'prolegal_db'
  });

  try {
    console.log('📝 Adding test contracts with specific expiry dates...');

    // Get contract type and department IDs
    const [contractTypes] = await connection.execute('SELECT id FROM contract_types LIMIT 1');
    const [departments] = await connection.execute('SELECT id FROM departments WHERE name LIKE "%IT%" LIMIT 1');
    
    const contractTypeId = contractTypes[0]?.id;
    const departmentId = departments[0]?.id;

    if (!contractTypeId || !departmentId) {
      console.log('⚠️ No contract types or IT department found.');
      return;
    }

    // Calculate test dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    
    const oneMonth = new Date(today);
    oneMonth.setDate(today.getDate() + 30);
    
    const twoMonths = new Date(today);
    twoMonths.setDate(today.getDate() + 60);
    
    const threeMonths = new Date(today);
    threeMonths.setDate(today.getDate() + 90);

    const testContracts = [
      {
        title: 'Software License Agreement - Expires Tomorrow',
        contract_number: 'CON-2024-TEST-01',
        end_date: tomorrow.toISOString().split('T')[0],
        value: '5000'
      },
      {
        title: 'IT Services Contract - Expires in 2 Weeks',
        contract_number: 'CON-2024-TEST-02',
        end_date: twoWeeks.toISOString().split('T')[0],
        value: '15000'
      },
      {
        title: 'Hardware Maintenance - Expires in 1 Month',
        contract_number: 'CON-2024-TEST-03',
        end_date: oneMonth.toISOString().split('T')[0],
        value: '25000'
      },
      {
        title: 'Cloud Services Agreement - Expires in 2 Months',
        contract_number: 'CON-2024-TEST-04',
        end_date: twoMonths.toISOString().split('T')[0],
        value: '50000'
      },
      {
        title: 'Enterprise Software License - Expires in 3 Months',
        contract_number: 'CON-2024-TEST-05',
        end_date: threeMonths.toISOString().split('T')[0],
        value: '100000'
      }
    ];

    for (const contract of testContracts) {
      const id = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await connection.execute(`
        INSERT INTO contracts (
          id, title, contract_number, description, contract_type_id, 
          department_id, start_date, end_date, value, currency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', 'active')
      `, [
        id,
        contract.title,
        contract.contract_number,
        `Test contract for expiry notification testing - ${contract.title}`,
        contractTypeId,
        departmentId,
        today.toISOString().split('T')[0],
        contract.end_date,
        contract.value
      ]);

      console.log(`✅ Added: ${contract.title} (Expires: ${contract.end_date})`);
    }

    console.log('\n🎉 Test contracts added successfully!');
    console.log('\n📅 Test Contract Expiry Schedule:');
    console.log(`   - Tomorrow: ${tomorrow.toLocaleDateString()}`);
    console.log(`   - 2 Weeks: ${twoWeeks.toLocaleDateString()}`);
    console.log(`   - 1 Month: ${oneMonth.toLocaleDateString()}`);
    console.log(`   - 2 Months: ${twoMonths.toLocaleDateString()}`);
    console.log(`   - 3 Months: ${threeMonths.toLocaleDateString()}`);
    console.log('\n💡 To test notifications, run: curl -X POST http://localhost:3000/api/contracts/check-expiry');

  } catch (error) {
    console.error('❌ Error adding test contracts:', error);
  } finally {
    await connection.end();
  }
}

addTestContracts();
