const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedLawFirms() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'prolegal_db'
  });

  try {
    console.log('🌱 Seeding law firms...');

    // Check if In House law firm already exists
    const [existing] = await connection.execute(
      "SELECT id FROM law_firms WHERE firm_type = 'in_house' LIMIT 1"
    );

    if (existing.length === 0) {
      // Insert In House law firm
      const inHouseId = uuidv4();
      await connection.execute(
        `INSERT INTO law_firms (
          id, name, firm_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [inHouseId, 'In House', 'in_house', 'active']
      );

      console.log('✅ Created In House law firm');
    } else {
      console.log('ℹ️  In House law firm already exists');
    }

    // Optional: Add some sample external law firms
    const sampleFirms = [
      {
        name: 'Corporate Legal Partners',
        firm_type: 'external',
        address: '123 Business District',
        city: 'Legal City',
        state: 'Legal State',
        country: 'Country',
        postal_code: '12345',
        contact_person: 'John Smith',
        email: 'contact@corporatelegal.com',
        phone: '+1-555-0123',
        website: 'https://corporatelegal.com',
        specializations: 'Corporate Law, Mergers & Acquisitions',
        bar_number: 'BAR123456',
        status: 'active'
      },
      {
        name: 'Litigation Specialists LLC',
        firm_type: 'external',
        address: '456 Court Street',
        city: 'Law City',
        state: 'Legal State',
        country: 'Country',
        postal_code: '67890',
        contact_person: 'Jane Doe',
        email: 'info@litigationspec.com',
        phone: '+1-555-0456',
        website: 'https://litigationspec.com',
        specializations: 'Civil Litigation, Employment Law',
        bar_number: 'BAR789012',
        status: 'active'
      }
    ];

    for (const firm of sampleFirms) {
      // Check if firm already exists
      const [existingFirm] = await connection.execute(
        "SELECT id FROM law_firms WHERE name = ? LIMIT 1",
        [firm.name]
      );

      if (existingFirm.length === 0) {
        const firmId = uuidv4();
        await connection.execute(
          `INSERT INTO law_firms (
            id, name, firm_type, address, city, state, country, postal_code,
            contact_person, email, phone, website, specializations, bar_number, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            firmId, firm.name, firm.firm_type, firm.address, firm.city, firm.state,
            firm.country, firm.postal_code, firm.contact_person, firm.email, firm.phone,
            firm.website, firm.specializations, firm.bar_number, firm.status
          ]
        );
        console.log(`✅ Created law firm: ${firm.name}`);
      } else {
        console.log(`ℹ️  Law firm already exists: ${firm.name}`);
      }
    }

    console.log('✅ Law firm seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding law firms:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedLawFirms().catch(console.error);
}

module.exports = { seedLawFirms };
