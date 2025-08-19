import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, Building, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { budgetService, Budget, CreateBudgetData, BudgetCategory } from '../services/budgetService';
import { useToast } from './ui/use-toast';
import { useAuth } from '../hooks/useAuth';
import { CategorySelector } from './CategorySelector';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget;
  onSuccess: () => void;
}

interface BudgetAllocation {
  category_id: string;
  allocated_amount: number;
  notes: string;
}

export function BudgetModal({ isOpen, onClose, budget, onSuccess }: BudgetModalProps) {
  const [formData, setFormData] = useState<CreateBudgetData>({
    name: '',
    description: '',
    period_type: 'yearly',
    start_date: '',
    end_date: '',
    total_amount: 0,
    currency: 'USD',
    department_id: ''
  });
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const isEditing = !!budget;

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      loadCategories();
      if (budget) {
        setFormData({
          name: budget.name,
          description: budget.description || '',
          period_type: budget.period_type,
          start_date: budget.start_date.split('T')[0],
          end_date: budget.end_date.split('T')[0],
          total_amount: budget.total_amount,
          currency: budget.currency,
          department_id: budget.department_id || ''
        });
        // Load existing allocations if editing
        loadBudgetAllocations(budget.id);
      } else {
        setFormData({
          name: '',
          description: '',
          period_type: 'yearly',
          start_date: '',
          end_date: '',
          total_amount: 0,
          currency: 'USD',
          department_id: ''
        });
        setAllocations([]);
      }
      setErrors({});
    }
  }, [isOpen, budget]);

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await budgetService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBudgetAllocations = async (budgetId: string) => {
    try {
      const data = await budgetService.getAllocations(budgetId);
      setAllocations(data.map(alloc => ({
        category_id: alloc.category_id,
        allocated_amount: alloc.allocated_amount,
        notes: alloc.notes || ''
      })));
    } catch (error) {
      console.error('Error loading budget allocations:', error);
    }
  };

  const addAllocation = () => {
    setAllocations([...allocations, {
      category_id: '',
      allocated_amount: 0,
      notes: ''
    }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof BudgetAllocation, value: any) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
  };

  const getRemainingAmount = () => {
    return formData.total_amount - getTotalAllocated();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Budget name is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (formData.total_amount <= 0) {
      newErrors.total_amount = 'Total amount must be greater than 0';
    }

    // Validate allocations
    const totalAllocated = getTotalAllocated();
    if (totalAllocated > formData.total_amount) {
      newErrors.allocations = 'Total allocated amount cannot exceed total budget amount';
    }

    const invalidAllocations = allocations.some(alloc => 
      !alloc.category_id || alloc.allocated_amount <= 0
    );
    if (invalidAllocations) {
      newErrors.allocations = 'All allocations must have a category and amount greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing && budget) {
        await budgetService.updateBudget(budget.id, formData);
        toast({
          title: 'Success',
          description: 'Budget updated successfully',
          variant: 'default'
        });
      } else {
        const createdBudget = await budgetService.createBudget({
          ...formData,
          created_by: user?.id || 'system'
        });
        
        // Create allocations for the new budget
        for (const allocation of allocations) {
          await budgetService.createAllocation(createdBudget.id, {
            category_id: allocation.category_id,
            allocated_amount: allocation.allocated_amount,
            notes: allocation.notes
          });
        }
        
        toast({
          title: 'Success',
          description: 'Budget created successfully',
          variant: 'default'
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to save budget',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateBudgetData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Budget' : 'Create New Budget'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter budget name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleInputChange('department_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter budget description"
                />
              </div>
            </div>

            {/* Period and Amount */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Period & Amount
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Type *
                  </label>
                  <select
                    value={formData.period_type}
                    onChange={(e) => handleInputChange('period_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ZAR">ZAR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Budget Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.total_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="0.00"
                />
                {errors.total_amount && <p className="mt-1 text-sm text-red-600">{errors.total_amount}</p>}
              </div>
            </div>

            {/* Budget Allocations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Budget Allocations
                </h3>
                <button
                  type="button"
                  onClick={addAllocation}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </button>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No budget allocations added yet.</p>
                  <p className="text-sm">Click "Add Category" to start allocating your budget.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allocations.map((allocation, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Category {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeAllocation(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                          </label>
                          <CategorySelector
                            value={allocation.category_id}
                            onChange={(categoryId) => updateAllocation(index, 'category_id', categoryId)}
                            placeholder="Search or add a category..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Allocated Amount *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={allocation.allocated_amount}
                            onChange={(e) => updateAllocation(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={allocation.notes}
                            onChange={(e) => updateAllocation(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Allocation Summary */}
              {allocations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Total Allocated:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {budgetService.formatCurrency(getTotalAllocated(), formData.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Remaining:</span>
                      <span className={`ml-2 font-semibold ${getRemainingAmount() >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {budgetService.formatCurrency(getRemainingAmount(), formData.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Utilization:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {formData.total_amount > 0 ? ((getTotalAllocated() / formData.total_amount) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {errors.allocations && (
                <p className="text-sm text-red-600">{errors.allocations}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update Budget' : 'Create Budget')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
