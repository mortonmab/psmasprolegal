const { BudgetService } = require('./dist/budgetService');

async function testBudgetService() {
  console.log('🧪 Testing Budget Service...\n');

  try {
    const budgetService = new BudgetService();

    // Test 1: Get categories
    console.log('1. Testing getCategories()');
    const categories = await budgetService.getCategories();
    console.log(`✅ Found ${categories.length} categories`);
    console.log('');

    // Test 2: Create a test budget
    console.log('2. Testing createBudget()');
    const testBudget = {
      name: 'Test Budget 2024',
      description: 'A test budget for demonstration purposes',
      period_type: 'yearly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      total_amount: 500000,
      currency: 'USD',
      status: 'draft',
      department_id: null,
      created_by: 'test-user-001'
    };

    const createdBudget = await budgetService.createBudget(testBudget);
    console.log('✅ Budget created successfully');
    console.log('Budget ID:', createdBudget.id);
    console.log('Budget Name:', createdBudget.name);
    console.log('');

    // Test 3: Get budget by ID
    console.log('3. Testing getBudgetById()');
    const budget = await budgetService.getBudgetById(createdBudget.id);
    console.log('✅ Budget retrieved successfully');
    console.log('Budget Details:', {
      name: budget.name,
      total_amount: budget.total_amount,
      status: budget.status
    });
    console.log('');

    // Test 4: Create budget allocation
    console.log('4. Testing createAllocation()');
    const testAllocation = {
      budget_id: createdBudget.id,
      category_id: categories[0].id,
      allocated_amount: 100000,
      notes: 'Test allocation for staff salaries',
      created_by: 'test-user-001'
    };

    const createdAllocation = await budgetService.createAllocation(testAllocation);
    console.log('✅ Budget allocation created successfully');
    console.log('Allocation Amount:', createdAllocation.allocated_amount);
    console.log('');

    // Test 5: Get budget allocations
    console.log('5. Testing getAllocations()');
    const allocations = await budgetService.getAllocations(createdBudget.id);
    console.log(`✅ Found ${allocations.length} allocations`);
    console.log('');

    // Test 6: Create budget expenditure
    console.log('6. Testing createExpenditure()');
    const testExpenditure = {
      budget_id: createdBudget.id,
      category_id: categories[0].id,
      title: 'Test Expenditure',
      description: 'A test expenditure for demonstration',
      amount: 5000,
      expense_date: new Date('2024-03-15'),
      vendor_id: null,
      invoice_number: 'INV-001',
      receipt_url: null,
      status: 'pending',
      created_by: 'test-user-001'
    };

    const createdExpenditure = await budgetService.createExpenditure(testExpenditure);
    console.log('✅ Budget expenditure created successfully');
    console.log('Expenditure Amount:', createdExpenditure.amount);
    console.log('');

    // Test 7: Get budget expenditures
    console.log('7. Testing getExpenditures()');
    const expenditures = await budgetService.getExpenditures(createdBudget.id);
    console.log(`✅ Found ${expenditures.length} expenditures`);
    console.log('');

    // Test 8: Get budget summary
    console.log('8. Testing getBudgetSummary()');
    const summary = await budgetService.getBudgetSummary(createdBudget.id);
    console.log('✅ Budget summary retrieved successfully');
    console.log('Summary:', {
      total_allocated: summary.total_allocated,
      total_spent: summary.total_spent,
      total_remaining: summary.total_remaining,
      utilization_percentage: summary.utilization_percentage
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error testing budget service:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('🎉 Budget service testing completed!');
}

// Run the test
testBudgetService();
