const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedTestContracts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'prolegal_db'
  });

  try {
    console.log('🌱 Seeding test contracts for expiry notifications...');

    // Get a contract type ID
    const [contractTypes] = await connection.execute('SELECT id FROM contract_types LIMIT 1');
    const contractTypeId = contractTypes[0]?.id;

    // Get a department ID
    const [departments] = await connection.execute('SELECT id FROM departments LIMIT 1');
    const departmentId = departments[0]?.id;

    if (!contractTypeId || !departmentId) {
      console.log('⚠️ No contract types or departments found. Please seed those first.');
      return;
    }

    // Calculate dates for testing
    const today = new Date();
    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setDate(today.getDate() + 90);

    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setDate(today.getDate() + 60);

    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setDate(today.getDate() + 30);

    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const testContracts = [
      {
        id: 'test-contract-3months',
        title: 'Test Contract - 3 Months to Expiry',
        contract_number: 'CON-2024-001',
        description: 'This contract will expire in 3 months for testing notifications',
        contract_type_id: contractTypeId,
        department_id: departmentId,
        start_date: today.toISOString().split('T')[0],
        end_date: threeMonthsFromNow.toISOString().split('T')[0],
        value: '50000',
        currency: 'USD',
        status: 'active'
      },
      {
        id: 'test-contract-2months',
        title: 'Test Contract - 2 Months to Expiry',
        contract_number: 'CON-2024-002',
        description: 'This contract will expire in 2 months for testing notifications',
        contract_type_id: contractTypeId,
        department_id: departmentId,
        start_date: today.toISOString().split('T')[0],
        end_date: twoMonthsFromNow.toISOString().split('T')[0],
        value: '75000',
        currency: 'USD',
        status: 'active'
      },
      {
        id: 'test-contract-1month',
        title: 'Test Contract - 1 Month to Expiry',
        contract_number: 'CON-2024-003',
        description: 'This contract will expire in 1 month for testing notifications',
        contract_type_id: contractTypeId,
        department_id: departmentId,
        start_date: today.toISOString().split('T')[0],
        end_date: oneMonthFromNow.toISOString().split('T')[0],
        value: '100000',
        currency: 'USD',
        status: 'active'
      },
      {
        id: 'test-contract-2weeks',
        title: 'Test Contract - 2 Weeks to Expiry',
        contract_number: 'CON-2024-004',
        description: 'This contract will expire in 2 weeks for testing urgent notifications',
        contract_type_id: contractTypeId,
        department_id: departmentId,
        start_date: today.toISOString().split('T')[0],
        end_date: twoWeeksFromNow.toISOString().split('T')[0],
        value: '25000',
        currency: 'USD',
        status: 'active'
      },
      {
        id: 'test-contract-tomorrow',
        title: 'Test Contract - Expires Tomorrow',
        contract_number: 'CON-2024-005',
        description: 'This contract expires tomorrow for testing expired notifications',
        contract_type_id: contractTypeId,
        department_id: departmentId,
        start_date: today.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
        value: '15000',
        currency: 'USD',
        status: 'active'
      }
    ];

    // Insert test contracts
    for (const contract of testContracts) {
      try {
        await connection.execute(`
          INSERT INTO contracts (
            id, title, contract_number, description, contract_type_id, 
            department_id, start_date, end_date, value, currency, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            end_date = VALUES(end_date),
            value = VALUES(value),
            status = VALUES(status)
        `, [
          contract.id,
          contract.title,
          contract.contract_number,
          contract.description,
          contract.contract_type_id,
          contract.department_id,
          contract.start_date,
          contract.end_date,
          contract.value,
          contract.currency,
          contract.status
        ]);

        console.log(`✅ Added/Updated test contract: ${contract.title}`);
      } catch (error) {
        console.error(`❌ Error adding contract ${contract.title}:`, error.message);
      }
    }

    console.log('🎉 Test contracts seeded successfully!');
    console.log('\n📅 Test Contract Expiry Dates:');
    console.log(`   - 3 Months: ${threeMonthsFromNow.toLocaleDateString()}`);
    console.log(`   - 2 Months: ${twoMonthsFromNow.toLocaleDateString()}`);
    console.log(`   - 1 Month: ${oneMonthFromNow.toLocaleDateString()}`);
    console.log(`   - 2 Weeks: ${twoWeeksFromNow.toLocaleDateString()}`);
    console.log(`   - Tomorrow: ${tomorrow.toLocaleDateString()}`);
    console.log('\n💡 To test notifications, run: curl -X POST http://localhost:3000/api/contracts/check-expiry');

  } catch (error) {
    console.error('❌ Error seeding test contracts:', error);
  } finally {
    await connection.end();
  }
}

seedTestContracts();
