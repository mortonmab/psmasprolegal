import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, Building, User } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { budgetService, BudgetExpenditure, CreateExpenditureData } from '../services/budgetService';
import { useToast } from './ui/use-toast';
import { VendorSelector } from './VendorSelector';
import { CategorySelector } from './CategorySelector';

interface ExpenditureModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenditure?: BudgetExpenditure;
  budgetId: string;
  onSuccess: () => void;
}

export function ExpenditureModal({ isOpen, onClose, expenditure, budgetId, onSuccess }: ExpenditureModalProps) {
  const [formData, setFormData] = useState<CreateExpenditureData>({
    category_id: '',
    title: '',
    description: '',
    amount: 0,
    expense_date: '',
    vendor_id: '',
    invoice_number: '',
    receipt_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isEditing = !!expenditure;

  useEffect(() => {
    if (isOpen) {
      if (expenditure) {
        setFormData({
          category_id: expenditure.category_id,
          title: expenditure.title,
          description: expenditure.description || '',
          amount: expenditure.amount,
          expense_date: expenditure.expense_date.split('T')[0],
          vendor_id: expenditure.vendor_id || '',
          invoice_number: expenditure.invoice_number || '',
          receipt_url: expenditure.receipt_url || ''
        });
      } else {
        setFormData({
          category_id: '',
          title: '',
          description: '',
          amount: 0,
          expense_date: new Date().toISOString().split('T')[0],
          vendor_id: '',
          invoice_number: '',
          receipt_url: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, expenditure]);



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'Expense date is required';
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
      if (isEditing && expenditure) {
        await budgetService.updateExpenditure(expenditure.id, formData);
        toast({
          title: 'Success',
          description: 'Expenditure updated successfully',
          variant: 'default'
        });
      } else {
        await budgetService.createExpenditure(budgetId, formData);
        toast({
          title: 'Success',
          description: 'Expenditure created successfully',
          variant: 'default'
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving expenditure:', error);
      toast({
        title: 'Error',
        description: 'Failed to save expenditure',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateExpenditureData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Expenditure' : 'Add New Expenditure'}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter expenditure title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
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
                  placeholder="Enter expenditure description"
                />
              </div>
            </div>

            {/* Category and Amount */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Category & Amount
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <CategorySelector
                  value={formData.category_id}
                  onChange={(categoryId) => handleInputChange('category_id', categoryId)}
                  placeholder="Search or add a category..."
                />
                {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                </div>
              </div>
            </div>

            {/* Date and Vendor */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Date & Vendor
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => handleInputChange('expense_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.expense_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.expense_date && <p className="mt-1 text-sm text-red-600">{errors.expense_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <VendorSelector
                    value={formData.vendor_id}
                    onChange={(vendorId) => handleInputChange('vendor_id', vendorId)}
                    placeholder="Search or add a vendor..."
                  />
                </div>
              </div>
            </div>

            {/* Invoice and Receipt */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Invoice & Receipt
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter invoice number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt URL
                  </label>
                  <input
                    type="url"
                    value={formData.receipt_url}
                    onChange={(e) => handleInputChange('receipt_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter receipt URL"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update Expenditure' : 'Add Expenditure')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
