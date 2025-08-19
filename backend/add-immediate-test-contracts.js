const mysql = require('mysql2/promise');
require('dotenv').config();

async function addImmediateTestContracts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'prolegal_db'
  });

  try {
    console.log('📝 Adding immediate test contracts for email notifications...');

    // Get contract type and department IDs
    const [contractTypes] = await connection.execute('SELECT id FROM contract_types LIMIT 1');
    const [departments] = await connection.execute('SELECT id FROM departments WHERE name LIKE "%IT%" LIMIT 1');
    
    const contractTypeId = contractTypes[0]?.id;
    const departmentId = departments[0]?.id;

    if (!contractTypeId || !departmentId) {
      console.log('⚠️ No contract types or IT department found.');
      return;
    }

    // Calculate immediate test dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    
    const oneMonth = new Date(today);
    oneMonth.setDate(today.getDate() + 30);

    const immediateTestContracts = [
      {
        title: 'URGENT: Software License - Expires Tomorrow',
        contract_number: 'CON-2024-URGENT-01',
        end_date: tomorrow.toISOString().split('T')[0],
        value: '5000',
        description: 'This contract expires tomorrow and should trigger an EXPIRED notification'
      },
      {
        title: 'CRITICAL: IT Services - Expires in 2 Weeks',
        contract_number: 'CON-2024-URGENT-02',
        end_date: twoWeeks.toISOString().split('T')[0],
        value: '15000',
        description: 'This contract expires in 2 weeks and should trigger an URGENT notification'
      },
      {
        title: 'IMPORTANT: Hardware Maintenance - Expires in 1 Month',
        contract_number: 'CON-2024-URGENT-03',
        end_date: oneMonth.toISOString().split('T')[0],
        value: '25000',
        description: 'This contract expires in 1 month and should trigger a reminder notification'
      }
    ];

    for (const contract of immediateTestContracts) {
      const id = `urgent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await connection.execute(`
        INSERT INTO contracts (
          id, title, contract_number, description, contract_type_id, 
          department_id, start_date, end_date, value, currency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', 'active')
      `, [
        id,
        contract.title,
        contract.contract_number,
        contract.description,
        contractTypeId,
        departmentId,
        today.toISOString().split('T')[0],
        contract.end_date,
        contract.value
      ]);

      console.log(`✅ Added: ${contract.title} (Expires: ${contract.end_date})`);
    }

    console.log('\n🎉 Immediate test contracts added successfully!');
    console.log('\n📅 Test Contract Expiry Schedule:');
    console.log(`   - Tomorrow: ${tomorrow.toLocaleDateString()} (EXPIRED notification)`);
    console.log(`   - 2 Weeks: ${twoWeeks.toLocaleDateString()} (URGENT notification)`);
    console.log(`   - 1 Month: ${oneMonth.toLocaleDateString()} (REMINDER notification)`);
    console.log('\n📧 Emails will be sent to:');
    console.log('   - Legal Manager: mortonmab@gmail.com');
    console.log('   - Legal Assistant: mortonmab@live.com');
    console.log('   - IT Department Head: hello@soxfort.com');
    console.log('\n💡 To test notifications, run: curl -X POST http://localhost:3000/api/contracts/check-expiry');

  } catch (error) {
    console.error('❌ Error adding immediate test contracts:', error);
  } finally {
    await connection.end();
  }
}

addImmediateTestContracts();
