import React, { useState, useEffect, Fragment } from 'react';
import { 
  DollarSign, 
  Plus, 
  Edit2, 
  PieChart,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  X,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { Menu, Dialog, Transition } from '@headlessui/react';
import { budgetService, Budget as BudgetType, BudgetSummary, BudgetExpenditure, BudgetAllocation } from '../services/budgetService';
import { BudgetModal } from '../components/BudgetModal';
import { ExpenditureModal } from '../components/ExpenditureModal';
import { useToast } from '../components/ui/use-toast';

type TabType = 'overview' | 'budgets' | 'expenditures' | 'analytics';

interface ChartFilters {
  dateRange: 'monthly' | 'quarterly' | 'yearly';
  categories: string[];
  comparison: 'year_over_year' | 'budget_vs_actual' | 'trend';
}

export function Budget() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    dateRange: 'monthly',
    categories: [],
    comparison: 'budget_vs_actual'
  });
  
  // Data states
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetType | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [expenditures, setExpenditures] = useState<BudgetExpenditure[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<any[]>([]);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  
  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenditureModal, setShowExpenditureModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const [editingExpenditure, setEditingExpenditure] = useState<BudgetExpenditure | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

  // Filter budgets based on search and filter criteria
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         budget.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;
    const matchesPeriod = periodFilter === 'all' || budget.period_type === periodFilter;
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      loadBudgetDetails(selectedBudget.id);
    }
  }, [selectedBudget]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        budgetService.getBudgets(),
        budgetService.getCategories()
      ]);
      
      setBudgets(budgetsData);
      setCategories(categoriesData);
      
      if (budgetsData.length > 0) {
        setSelectedBudget(budgetsData[0]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetDetails = async (budgetId: string) => {
    setLoadingSummary(true);
    try {
      const [summary, expendituresData, allocationsData, monthlyData, categoryData] = await Promise.all([
        budgetService.getBudgetSummary(budgetId),
        budgetService.getExpenditures(budgetId),
        budgetService.getAllocations(budgetId),
        budgetService.getMonthlySpending(budgetId, selectedYear),
        budgetService.getCategorySpending(budgetId)
      ]);
      
      setBudgetSummary(summary);
      setExpenditures(expendituresData);
      setAllocations(allocationsData);
      setMonthlySpending(monthlyData);
      setCategorySpending(categoryData);
    } catch (error) {
      console.error('Error loading budget details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget details',
        variant: 'destructive'
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleBudgetSuccess = () => {
    loadInitialData();
  };

  const handleExpenditureSuccess = () => {
    if (selectedBudget) {
      loadBudgetDetails(selectedBudget.id);
    }
  };

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const handleEditBudget = (budget: BudgetType) => {
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleCreateExpenditure = () => {
    setEditingExpenditure(null);
    setShowExpenditureModal(true);
  };

  const handleEditExpenditure = (expenditure: BudgetExpenditure) => {
    setEditingExpenditure(expenditure);
    setShowExpenditureModal(true);
  };

  const handleApproveExpenditure = async (expenditure: BudgetExpenditure) => {
    try {
      await budgetService.approveExpenditure(expenditure.id);
      toast({
        title: 'Success',
        description: 'Expenditure approved successfully',
        variant: 'default'
      });
      handleExpenditureSuccess();
    } catch (error) {
      console.error('Error approving expenditure:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve expenditure',
        variant: 'destructive'
      });
    }
  };

  const exportAnalytics = (format: 'pdf' | 'excel' | 'csv') => {
    // Implementation for export functionality
    console.log(`Exporting as ${format}`);
    toast({
      title: 'Info',
      description: `Export functionality for ${format.toUpperCase()} will be implemented soon`,
      variant: 'default'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'archived':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Budget Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Select Budget</h3>
          <button
            onClick={handleCreateBudget}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search budgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Periods</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>
        
        {filteredBudgets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredBudgets.map((budget) => (
              <div
                key={budget.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:shadow-md ${
                  selectedBudget?.id === budget.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedBudget(budget)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">{budget.name}</h4>
                  {getStatusIcon(budget.status)}
                </div>
                {budget.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{budget.description}</p>
                )}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 capitalize">{budget.period_type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${budgetService.getStatusColor(budget.status)}`}>
                      {budgetService.getStatusLabel(budget.status)}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    {budgetService.formatCurrency(budget.total_amount, budget.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : budgets.length > 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets match your search</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new budget.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateBudget}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Budget
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Budget Summary */}
      {selectedBudget && budgetSummary && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Allocated</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {budgetService.formatCurrency(budgetSummary.total_allocated, selectedBudget.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Spent</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {budgetService.formatCurrency(budgetSummary.total_spent, selectedBudget.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Percent className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Utilization</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {budgetService.formatPercentage(budgetSummary.utilization_percentage)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Remaining</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {budgetService.formatCurrency(budgetSummary.total_remaining, selectedBudget.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Category Breakdown</h3>
                <button
                  onClick={handleCreateExpenditure}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expenditure
                </button>
              </div>
              <div className="mt-4">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Category</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Allocated</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Spent</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Remaining</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Utilization</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {budgetSummary.category_breakdown.map((category) => (
                        <tr key={category.category_id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {category.category_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {budgetService.formatCurrency(category.allocated, selectedBudget.currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {budgetService.formatCurrency(category.spent, selectedBudget.currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {budgetService.formatCurrency(category.remaining, selectedBudget.currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`font-medium ${budgetService.getUtilizationColor(category.utilization_percentage)}`}>
                              {budgetService.formatPercentage(category.utilization_percentage)}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBudgets = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">All Budgets</h3>
            <p className="mt-1 text-sm text-gray-700">
              Manage and track all your budgets
            </p>
          </div>
          <button
            onClick={handleCreateBudget}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search budgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Periods</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-3 pl-4 pr-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                          {budget.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{budget.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                        <div className="capitalize">{budget.period_type}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                        {budgetService.formatCurrency(budget.total_amount, budget.currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                        {budget.department_name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${budgetService.getStatusColor(budget.status)}`}>
                          {budgetService.getStatusLabel(budget.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                        {new Date(budget.created_at).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditBudget(budget)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Budget"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedBudget(budget)}
                            className="text-green-600 hover:text-green-900"
                            title="View Budget"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : budgets.length > 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-8 w-8 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets match your search</h3>
                      <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating a new budget.</p>
                      <div className="mt-6">
                        <button
                          onClick={handleCreateBudget}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Budget
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExpenditures = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Expenditures</h3>
            <p className="mt-1 text-sm text-gray-700">
              Track all budget expenditures
            </p>
          </div>
          <button
            onClick={handleCreateExpenditure}
            disabled={!selectedBudget}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expenditure
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vendor</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {expenditures.map((expenditure) => (
                  <tr key={expenditure.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expenditure.title}</div>
                        <div className="text-sm text-gray-500">{expenditure.description}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {expenditure.category_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {budgetService.formatCurrency(expenditure.amount, selectedBudget?.currency || 'USD')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(expenditure.expense_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {expenditure.vendor_name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${budgetService.getStatusColor(expenditure.status)}`}>
                        {budgetService.getStatusLabel(expenditure.status)}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditExpenditure(expenditure)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {expenditure.status === 'pending' && (
                          <button
                            onClick={() => handleApproveExpenditure(expenditure)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Menu as="div" className="relative">
              <Menu.Button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className="h-4 w-4 ml-2" />
              </Menu.Button>
              <Menu.Items className="absolute z-10 mt-2 w-56 bg-white rounded-md shadow-lg p-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                    <select
                      value={chartFilters.dateRange}
                      onChange={(e) => setChartFilters(prev => ({
                        ...prev,
                        dateRange: e.target.value as ChartFilters['dateRange']
                      }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </Menu.Items>
            </Menu>

            <Menu as="div" className="relative">
              <Menu.Button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Menu.Button>
              <Menu.Items className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg">
                <div className="py-1">
                  {['pdf', 'excel', 'csv'].map((format) => (
                    <Menu.Item key={format}>
                      {({ active }) => (
                        <button
                          onClick={() => exportAnalytics(format as 'pdf' | 'excel' | 'csv')}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                        >
                          Export as {format.toUpperCase()}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>

      {/* Monthly Spending Chart */}
      {monthlySpending.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Spending Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_spent" stroke="#3B82F6" name="Total Spent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {categorySpending.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categorySpending}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="allocated"
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Category Comparison</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="allocated" fill="#3B82F6" name="Allocated" />
                  <Bar dataKey="spent" fill="#10B981" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Budget Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track your budget allocations and expenditures
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`${
              activeTab === 'budgets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-5 w-5 mr-2" />
            Budgets
          </button>
          <button
            onClick={() => setActiveTab('expenditures')}
            className={`${
              activeTab === 'expenditures'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Expenditures
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'budgets' && renderBudgets()}
      {activeTab === 'expenditures' && renderExpenditures()}
      {activeTab === 'analytics' && renderAnalytics()}

      {/* Modals */}
      <BudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        budget={editingBudget || undefined}
        onSuccess={handleBudgetSuccess}
      />

      {selectedBudget && (
        <ExpenditureModal
          isOpen={showExpenditureModal}
          onClose={() => setShowExpenditureModal(false)}
          expenditure={editingExpenditure || undefined}
          budgetId={selectedBudget.id}
          onSuccess={handleExpenditureSuccess}
        />
      )}
    </div>
  );
} 