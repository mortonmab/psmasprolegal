import { pool, generateUUID } from './database';

export interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  start_date: Date;
  end_date: Date;
  total_amount: number;
  currency: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  department_id?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
  department_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  category?: BudgetCategory;
  category_name?: string;
  category_color?: string;
}

export interface BudgetExpenditure {
  id: string;
  budget_id: string;
  category_id: string;
  title: string;
  description?: string;
  amount: number;
  expense_date: Date;
  vendor_id?: string;
  invoice_number?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
  approved_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  category?: BudgetCategory;
  vendor?: any;
  category_name?: string;
  category_color?: string;
  vendor_name?: string;
}

export interface BudgetTransfer {
  id: string;
  budget_id: string;
  from_category_id: string;
  to_category_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  from_category_name?: string;
  to_category_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
}

export interface BudgetSummary {
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  utilization_percentage: number;
  category_breakdown: Array<{
    category_id: string;
    category_name: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilization_percentage: number;
  }>;
}

export class BudgetService {
  // Budget Categories
  async getCategories(): Promise<BudgetCategory[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM budget_categories WHERE is_active = TRUE ORDER BY name'
    );
    return rows as BudgetCategory[];
  }

  async createCategory(category: Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetCategory> {
    const id = generateUUID();
    const [result] = await pool.execute(
      'INSERT INTO budget_categories (id, name, description, color, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, category.name, category.description, category.color, category.is_active, category.created_by]
    );
    const createdCategory = await this.getCategoryById(id);
    if (!createdCategory) {
      throw new Error('Failed to create budget category');
    }
    return createdCategory;
  }

  async getCategoryById(id: string): Promise<BudgetCategory | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM budget_categories WHERE id = ?',
      [id]
    );
    const categories = rows as BudgetCategory[];
    return categories.length > 0 ? categories[0] : null;
  }

  async updateCategory(id: string, updates: Partial<BudgetCategory>): Promise<BudgetCategory | null> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await pool.execute(
      `UPDATE budget_categories SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return this.getCategoryById(id);
  }

  // Budgets
  async createBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> {
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const nameValue = budget.name || '';
    const descriptionValue = budget.description || null;
    const periodTypeValue = budget.period_type || 'yearly';
    const startDateValue = budget.start_date || null;
    const endDateValue = budget.end_date || null;
    const totalAmountValue = budget.total_amount || 0;
    const currencyValue = budget.currency || 'USD';
    const statusValue = budget.status || 'active';
    const departmentIdValue = budget.department_id || null;
    const createdByValue = budget.created_by || '';
    
    const [result] = await pool.execute(
      `INSERT INTO budgets (id, name, description, period_type, start_date, end_date, 
        total_amount, currency, status, department_id, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nameValue, descriptionValue, periodTypeValue, startDateValue, 
       endDateValue, totalAmountValue, currencyValue, statusValue, 
       departmentIdValue, createdByValue]
    );
    const createdBudget = await this.getBudgetById(id);
    if (!createdBudget) {
      throw new Error('Failed to create budget');
    }
    return createdBudget;
  }

  async getBudgets(filters?: {
    status?: string;
    department_id?: string;
    period_type?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<Budget[]> {
    let query = `
      SELECT b.*, d.name as department_name, 
             u1.full_name as created_by_name, u2.full_name as approved_by_name
      FROM budgets b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.approved_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters?.department_id) {
      query += ' AND b.department_id = ?';
      params.push(filters.department_id);
    }
    if (filters?.period_type) {
      query += ' AND b.period_type = ?';
      params.push(filters.period_type);
    }
    if (filters?.start_date) {
      query += ' AND b.start_date >= ?';
      params.push(filters.start_date);
    }
    if (filters?.end_date) {
      query += ' AND b.end_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY b.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows as Budget[];
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    const [rows] = await pool.execute(
      `SELECT b.*, d.name as department_name, 
              u1.full_name as created_by_name, u2.full_name as approved_by_name
       FROM budgets b
       LEFT JOIN departments d ON b.department_id = d.id
       LEFT JOIN users u1 ON b.created_by = u1.id
       LEFT JOIN users u2 ON b.approved_by = u2.id
       WHERE b.id = ?`,
      [id]
    );
    const budgets = rows as Budget[];
    return budgets.length > 0 ? budgets[0] : null;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await pool.execute(
      `UPDATE budgets SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return this.getBudgetById(id);
  }

  async approveBudget(id: string, approved_by: string): Promise<Budget | null> {
    await pool.execute(
      'UPDATE budgets SET status = "active", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [approved_by, id]
    );
    return this.getBudgetById(id);
  }

  // Budget Allocations
  async createAllocation(allocation: Omit<BudgetAllocation, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetAllocation> {
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const budgetIdValue = allocation.budget_id || '';
    const categoryIdValue = allocation.category_id || '';
    const allocatedAmountValue = allocation.allocated_amount || 0;
    const notesValue = allocation.notes || null;
    const createdByValue = allocation.created_by || '';
    
    const [result] = await pool.execute(
      'INSERT INTO budget_allocations (id, budget_id, category_id, allocated_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, budgetIdValue, categoryIdValue, allocatedAmountValue, notesValue, createdByValue]
    );
    const createdAllocation = await this.getAllocationById(id);
    if (!createdAllocation) {
      throw new Error('Failed to create budget allocation');
    }
    return createdAllocation;
  }

  async getAllocations(budget_id: string): Promise<BudgetAllocation[]> {
    const [rows] = await pool.execute(
      `SELECT ba.*, bc.name as category_name, bc.color as category_color
       FROM budget_allocations ba
       JOIN budget_categories bc ON ba.category_id = bc.id
       WHERE ba.budget_id = ?
       ORDER BY bc.name`,
      [budget_id]
    );
    return rows as BudgetAllocation[];
  }

  async getAllocationById(id: string): Promise<BudgetAllocation | null> {
    const [rows] = await pool.execute(
      `SELECT ba.*, bc.name as category_name, bc.color as category_color
       FROM budget_allocations ba
       JOIN budget_categories bc ON ba.category_id = bc.id
       WHERE ba.id = ?`,
      [id]
    );
    const allocations = rows as BudgetAllocation[];
    return allocations.length > 0 ? allocations[0] : null;
  }

  async updateAllocation(id: string, updates: Partial<BudgetAllocation>): Promise<BudgetAllocation | null> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await pool.execute(
      `UPDATE budget_allocations SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return this.getAllocationById(id);
  }

  // Budget Expenditures
  async createExpenditure(expenditure: Omit<BudgetExpenditure, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetExpenditure> {
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const budgetIdValue = expenditure.budget_id || '';
    const categoryIdValue = expenditure.category_id || '';
    const titleValue = expenditure.title || '';
    const descriptionValue = expenditure.description || null;
    const amountValue = expenditure.amount || 0;
    const expenseDateValue = expenditure.expense_date || null;
    const vendorIdValue = expenditure.vendor_id || null;
    const invoiceNumberValue = expenditure.invoice_number || null;
    const receiptUrlValue = expenditure.receipt_url || null;
    const statusValue = expenditure.status || 'pending';
    const createdByValue = expenditure.created_by || '';
    
    const [result] = await pool.execute(
      `INSERT INTO budget_expenditures (id, budget_id, category_id, title, description, 
        amount, expense_date, vendor_id, invoice_number, receipt_url, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, budgetIdValue, categoryIdValue, titleValue, descriptionValue, 
       amountValue, expenseDateValue, vendorIdValue, invoiceNumberValue, 
       receiptUrlValue, statusValue, createdByValue]
    );
    const createdExpenditure = await this.getExpenditureById(id);
    if (!createdExpenditure) {
      throw new Error('Failed to create budget expenditure');
    }
    return createdExpenditure;
  }

  async getExpenditures(budget_id: string, filters?: {
    category_id?: string;
    status?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<BudgetExpenditure[]> {
    let query = `
      SELECT be.*, bc.name as category_name, bc.color as category_color,
             v.name as vendor_name
      FROM budget_expenditures be
      JOIN budget_categories bc ON be.category_id = bc.id
      LEFT JOIN vendors v ON be.vendor_id = v.id
      WHERE be.budget_id = ?
    `;
    const params: any[] = [budget_id];

    if (filters?.category_id) {
      query += ' AND be.category_id = ?';
      params.push(filters.category_id);
    }
    if (filters?.status) {
      query += ' AND be.status = ?';
      params.push(filters.status);
    }
    if (filters?.start_date) {
      query += ' AND be.expense_date >= ?';
      params.push(filters.start_date);
    }
    if (filters?.end_date) {
      query += ' AND be.expense_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY be.expense_date DESC';

    const [rows] = await pool.execute(query, params);
    return rows as BudgetExpenditure[];
  }

  async getExpenditureById(id: string): Promise<BudgetExpenditure | null> {
    const [rows] = await pool.execute(
      `SELECT be.*, bc.name as category_name, bc.color as category_color,
              v.name as vendor_name
       FROM budget_expenditures be
       JOIN budget_categories bc ON be.category_id = bc.id
       LEFT JOIN vendors v ON be.vendor_id = v.id
       WHERE be.id = ?`,
      [id]
    );
    const expenditures = rows as BudgetExpenditure[];
    return expenditures.length > 0 ? expenditures[0] : null;
  }

  async updateExpenditure(id: string, updates: Partial<BudgetExpenditure>): Promise<BudgetExpenditure | null> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await pool.execute(
      `UPDATE budget_expenditures SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    return this.getExpenditureById(id);
  }

  async approveExpenditure(id: string, approved_by: string): Promise<BudgetExpenditure | null> {
    await pool.execute(
      'UPDATE budget_expenditures SET status = "approved", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [approved_by, id]
    );
    return this.getExpenditureById(id);
  }

  // Budget Transfers
  async createTransfer(transfer: Omit<BudgetTransfer, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetTransfer> {
    const id = generateUUID();
    
    // Convert undefined values to null for MySQL
    const budgetIdValue = transfer.budget_id || '';
    const fromCategoryIdValue = transfer.from_category_id || '';
    const toCategoryIdValue = transfer.to_category_id || '';
    const amountValue = transfer.amount || 0;
    const reasonValue = transfer.reason || '';
    const statusValue = transfer.status || 'pending';
    const createdByValue = transfer.created_by || '';
    
    const [result] = await pool.execute(
      `INSERT INTO budget_transfers (id, budget_id, from_category_id, to_category_id, 
        amount, reason, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, budgetIdValue, fromCategoryIdValue, toCategoryIdValue, 
       amountValue, reasonValue, statusValue, createdByValue]
    );
    const createdTransfer = await this.getTransferById(id);
    if (!createdTransfer) {
      throw new Error('Failed to create budget transfer');
    }
    return createdTransfer;
  }

  async getTransfers(budget_id: string): Promise<BudgetTransfer[]> {
    const [rows] = await pool.execute(
      `SELECT bt.*, 
              fc.name as from_category_name, tc.name as to_category_name,
              u.full_name as created_by_name, a.full_name as approved_by_name
       FROM budget_transfers bt
       JOIN budget_categories fc ON bt.from_category_id = fc.id
       JOIN budget_categories tc ON bt.to_category_id = tc.id
       JOIN users u ON bt.created_by = u.id
       LEFT JOIN users a ON bt.approved_by = a.id
       WHERE bt.budget_id = ?
       ORDER BY bt.created_at DESC`,
      [budget_id]
    );
    return rows as BudgetTransfer[];
  }

  async getTransferById(id: string): Promise<BudgetTransfer | null> {
    const [rows] = await pool.execute(
      `SELECT bt.*, 
              fc.name as from_category_name, tc.name as to_category_name,
              u.full_name as created_by_name, a.full_name as approved_by_name
       FROM budget_transfers bt
       JOIN budget_categories fc ON bt.from_category_id = fc.id
       JOIN budget_categories tc ON bt.to_category_id = tc.id
       JOIN users u ON bt.created_by = u.id
       LEFT JOIN users a ON bt.approved_by = a.id
       WHERE bt.id = ?`,
      [id]
    );
    const transfers = rows as BudgetTransfer[];
    return transfers.length > 0 ? transfers[0] : null;
  }

  async approveTransfer(id: string, approved_by: string): Promise<BudgetTransfer | null> {
    await pool.execute(
      'UPDATE budget_transfers SET status = "approved", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [approved_by, id]
    );
    return this.getTransferById(id);
  }

  // Budget Summary and Analytics
  async getBudgetSummary(budget_id: string): Promise<BudgetSummary> {
    // Get allocations
    const allocations = await this.getAllocations(budget_id);
    
    // Get expenditures
    const expenditures = await this.getExpenditures(budget_id);
    
    // Calculate totals - ensure proper number conversion
    const total_allocated = allocations.reduce((sum, alloc) => sum + Number(alloc.allocated_amount), 0);
    const total_spent = expenditures
      .filter(exp => exp.status === 'approved' || exp.status === 'paid')
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    const total_remaining = total_allocated - total_spent;
    const utilization_percentage = total_allocated > 0 ? (total_spent / total_allocated) * 100 : 0;

    // Calculate category breakdown
    const category_breakdown = allocations.map(alloc => {
      const category_expenditures = expenditures.filter(exp => 
        exp.category_id === alloc.category_id && 
        (exp.status === 'approved' || exp.status === 'paid')
      );
      const spent = category_expenditures.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const remaining = Number(alloc.allocated_amount) - spent;
      const utilization = Number(alloc.allocated_amount) > 0 ? (spent / Number(alloc.allocated_amount)) * 100 : 0;

      return {
        category_id: alloc.category_id,
        category_name: alloc.category_name || '',
        allocated: Number(alloc.allocated_amount),
        spent,
        remaining,
        utilization_percentage: utilization
      };
    });

    return {
      total_allocated,
      total_spent,
      total_remaining,
      utilization_percentage,
      category_breakdown
    };
  }

  async getMonthlySpending(budget_id: string, year: number): Promise<any[]> {
    const [rows] = await pool.execute(
      `SELECT 
        MONTH(expense_date) as month,
        SUM(amount) as total_spent,
        COUNT(*) as transaction_count
       FROM budget_expenditures 
       WHERE budget_id = ? 
         AND YEAR(expense_date) = ?
         AND (status = 'approved' OR status = 'paid')
       GROUP BY MONTH(expense_date)
       ORDER BY month`,
      [budget_id, year]
    );
    return rows as any[];
  }

  async getCategorySpending(budget_id: string): Promise<any[]> {
    const [rows] = await pool.execute(
      `SELECT 
        bc.id as category_id,
        bc.name as category_name,
        bc.color as category_color,
        COALESCE(ba.allocated_amount, 0) as allocated,
        COALESCE(SUM(be.amount), 0) as spent
       FROM budget_categories bc
       LEFT JOIN budget_allocations ba ON bc.id = ba.category_id AND ba.budget_id = ?
       LEFT JOIN budget_expenditures be ON bc.id = be.category_id AND be.budget_id = ? 
         AND (be.status = 'approved' OR be.status = 'paid')
       WHERE bc.is_active = TRUE
       GROUP BY bc.id, bc.name, bc.color, ba.allocated_amount
       ORDER BY bc.name`,
      [budget_id, budget_id]
    );
    return rows as any[];
  }
}
