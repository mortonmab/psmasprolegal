const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testBudgetAPI() {
  console.log('🧪 Testing Budget API Endpoints...\n');

  try {
    // Test 1: Get budget categories
    console.log('1. Testing GET /budget/categories');
    const categoriesResponse = await fetch(`${BASE_URL}/budget/categories`);
    const categories = await categoriesResponse.json();
    console.log(`✅ Found ${categories.length} budget categories`);
    console.log('Categories:', categories.map(c => c.name).join(', '));
    console.log('');

    // Test 2: Create a test budget
    console.log('2. Testing POST /budgets');
    const testBudget = {
      name: 'Test Budget 2024',
      description: 'A test budget for demonstration purposes',
      period_type: 'yearly',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      total_amount: 500000,
      currency: 'USD',
      department_id: null
    };

    const createBudgetResponse = await fetch(`${BASE_URL}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will be handled by the service
      },
      body: JSON.stringify(testBudget)
    });

    if (createBudgetResponse.ok) {
      const createdBudget = await createBudgetResponse.json();
      console.log('✅ Budget created successfully');
      console.log('Budget ID:', createdBudget.id);
      console.log('Budget Name:', createdBudget.name);
      console.log('');

      // Test 3: Get all budgets
      console.log('3. Testing GET /budgets');
      const budgetsResponse = await fetch(`${BASE_URL}/budgets`);
      const budgets = await budgetsResponse.json();
      console.log(`✅ Found ${budgets.length} budgets`);
      console.log('');

      // Test 4: Get budget by ID
      console.log('4. Testing GET /budgets/:id');
      const budgetResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}`);
      const budget = await budgetResponse.json();
      console.log('✅ Budget retrieved successfully');
      console.log('Budget Details:', {
        name: budget.name,
        total_amount: budget.total_amount,
        status: budget.status
      });
      console.log('');

      // Test 5: Create budget allocation
      console.log('5. Testing POST /budgets/:id/allocations');
      const testAllocation = {
        category_id: categories[0].id,
        allocated_amount: 100000,
        notes: 'Test allocation for staff salaries'
      };

      const createAllocationResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testAllocation)
      });

      if (createAllocationResponse.ok) {
        const createdAllocation = await createAllocationResponse.json();
        console.log('✅ Budget allocation created successfully');
        console.log('Allocation Amount:', createdAllocation.allocated_amount);
        console.log('');

        // Test 6: Get budget allocations
        console.log('6. Testing GET /budgets/:id/allocations');
        const allocationsResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/allocations`);
        const allocations = await allocationsResponse.json();
        console.log(`✅ Found ${allocations.length} allocations`);
        console.log('');

        // Test 7: Create budget expenditure
        console.log('7. Testing POST /budgets/:id/expenditures');
        const testExpenditure = {
          category_id: categories[0].id,
          title: 'Test Expenditure',
          description: 'A test expenditure for demonstration',
          amount: 5000,
          expense_date: '2024-03-15',
          vendor_id: null,
          invoice_number: 'INV-001',
          receipt_url: null
        };

        const createExpenditureResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/expenditures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify(testExpenditure)
        });

        if (createExpenditureResponse.ok) {
          const createdExpenditure = await createExpenditureResponse.json();
          console.log('✅ Budget expenditure created successfully');
          console.log('Expenditure Amount:', createdExpenditure.amount);
          console.log('');

          // Test 8: Get budget expenditures
          console.log('8. Testing GET /budgets/:id/expenditures');
          const expendituresResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/expenditures`);
          const expenditures = await expendituresResponse.json();
          console.log(`✅ Found ${expenditures.length} expenditures`);
          console.log('');

          // Test 9: Get budget summary
          console.log('9. Testing GET /budgets/:id/summary');
          const summaryResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/summary`);
          const summary = await summaryResponse.json();
          console.log('✅ Budget summary retrieved successfully');
          console.log('Summary:', {
            total_allocated: summary.total_allocated,
            total_spent: summary.total_spent,
            total_remaining: summary.total_remaining,
            utilization_percentage: summary.utilization_percentage
          });
          console.log('');

          // Test 10: Get monthly spending
          console.log('10. Testing GET /budgets/:id/monthly-spending');
          const monthlyResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/monthly-spending?year=2024`);
          const monthlyData = await monthlyResponse.json();
          console.log('✅ Monthly spending data retrieved successfully');
          console.log(`Found ${monthlyData.length} months of data`);
          console.log('');

          // Test 11: Get category spending
          console.log('11. Testing GET /budgets/:id/category-spending');
          const categoryResponse = await fetch(`${BASE_URL}/budgets/${createdBudget.id}/category-spending`);
          const categoryData = await categoryResponse.json();
          console.log('✅ Category spending data retrieved successfully');
          console.log(`Found ${categoryData.length} categories with spending data`);
          console.log('');

        } else {
          console.log('❌ Failed to create budget expenditure');
          console.log('Status:', createExpenditureResponse.status);
        }
      } else {
        console.log('❌ Failed to create budget allocation');
        console.log('Status:', createAllocationResponse.status);
      }
    } else {
      console.log('❌ Failed to create budget');
      console.log('Status:', createBudgetResponse.status);
    }

  } catch (error) {
    console.error('❌ Error testing budget API:', error.message);
  }

  console.log('🎉 Budget API testing completed!');
}

// Run the test
testBudgetAPI();
