import { apiService } from './apiService';

export interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  department_id?: string;
  department_name?: string;
  created_by: string;
  created_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  expense_date: string;
  vendor_id?: string;
  vendor_name?: string;
  invoice_number?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
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
  approved_at?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  from_category_name?: string;
  to_category_name?: string;
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

export interface CreateBudgetData {
  name: string;
  description?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  total_amount: number;
  currency?: string;
  department_id?: string;
}

export interface CreateAllocationData {
  category_id: string;
  allocated_amount: number;
  notes?: string;
}

export interface CreateExpenditureData {
  category_id: string;
  title: string;
  description?: string;
  amount: number;
  expense_date: string;
  vendor_id?: string;
  invoice_number?: string;
  receipt_url?: string;
}

export interface CreateTransferData {
  from_category_id: string;
  to_category_id: string;
  amount: number;
  reason: string;
}

export class BudgetService {
  // Budget Categories
  async getCategories(): Promise<BudgetCategory[]> {
    return apiService.get('/budget/categories');
  }

  async createCategory(data: { name: string; description?: string; color?: string; is_active?: boolean; created_by?: string }): Promise<BudgetCategory> {
    return apiService.post('/budget/categories', data);
  }

  // Budgets
  async getBudgets(filters?: {
    status?: string;
    department_id?: string;
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Budget[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    return apiService.get(`/budgets?${params.toString()}`);
  }

  async createBudget(data: CreateBudgetData): Promise<Budget> {
    return apiService.post('/budgets', data);
  }

  async getBudgetById(id: string): Promise<Budget> {
    return apiService.get(`/budgets/${id}`);
  }

  async updateBudget(id: string, data: Partial<CreateBudgetData>): Promise<Budget> {
    return apiService.put(`/budgets/${id}`, data);
  }

  async approveBudget(id: string): Promise<Budget> {
    return apiService.post(`/budgets/${id}/approve`);
  }

  // Budget Allocations
  async getAllocations(budgetId: string): Promise<BudgetAllocation[]> {
    return apiService.get(`/budgets/${budgetId}/allocations`);
  }

  async createAllocation(budgetId: string, data: CreateAllocationData): Promise<BudgetAllocation> {
    return apiService.post(`/budgets/${budgetId}/allocations`, data);
  }

  // Budget Expenditures
  async getExpenditures(budgetId: string, filters?: {
    category_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<BudgetExpenditure[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    return apiService.get(`/budgets/${budgetId}/expenditures?${params.toString()}`);
  }

  async createExpenditure(budgetId: string, data: CreateExpenditureData): Promise<BudgetExpenditure> {
    return apiService.post(`/budgets/${budgetId}/expenditures`, data);
  }

  async updateExpenditure(id: string, data: Partial<CreateExpenditureData>): Promise<BudgetExpenditure> {
    return apiService.put(`/expenditures/${id}`, data);
  }

  async approveExpenditure(id: string): Promise<BudgetExpenditure> {
    return apiService.post(`/expenditures/${id}/approve`);
  }

  // Budget Transfers
  async getTransfers(budgetId: string): Promise<BudgetTransfer[]> {
    return apiService.get(`/budgets/${budgetId}/transfers`);
  }

  async createTransfer(budgetId: string, data: CreateTransferData): Promise<BudgetTransfer> {
    return apiService.post(`/budgets/${budgetId}/transfers`, data);
  }

  async approveTransfer(id: string): Promise<BudgetTransfer> {
    return apiService.post(`/transfers/${id}/approve`);
  }

  // Budget Analytics
  async getBudgetSummary(budgetId: string): Promise<BudgetSummary> {
    return apiService.get(`/budgets/${budgetId}/summary`);
  }

  async getMonthlySpending(budgetId: string, year: number): Promise<any[]> {
    return apiService.get(`/budgets/${budgetId}/monthly-spending?year=${year}`);
  }

  async getCategorySpending(budgetId: string): Promise<any[]> {
    return apiService.get(`/budgets/${budgetId}/category-spending`);
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  calculateUtilization(allocated: number, spent: number): number {
    if (allocated === 0) return 0;
    return (spent / allocated) * 100;
  }

  getUtilizationStatus(utilization: number): 'on_track' | 'at_risk' | 'over_budget' {
    if (utilization >= 100) return 'over_budget';
    if (utilization >= 80) return 'at_risk';
    return 'on_track';
  }

  getUtilizationColor(utilization: number): string {
    const status = this.getUtilizationStatus(utilization);
    switch (status) {
      case 'on_track':
        return 'text-green-600';
      case 'at_risk':
        return 'text-yellow-600';
      case 'over_budget':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }
}

export const budgetService = new BudgetService();
