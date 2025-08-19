import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { budgetService } from '../services/budgetService';
import { useAuth } from '../hooks/useAuth';

interface BudgetCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, placeholder = "Search categories...", disabled = false }: CategorySelectorProps) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load categories
  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await budgetService.getCategories();
      console.log('Loaded categories:', data);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('CategorySelector mounted');
    loadCategories();
    return () => {
      console.log('CategorySelector unmounted');
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category: BudgetCategory) => {
    onChange(category.id);
    setSearchTerm(category.name);
    setShowDropdown(false);
  };

  // Handle new category creation
  const handleCategoryCreated = (category: BudgetCategory) => {
    setCategories(prev => [category, ...prev]);
    // Update the parent component with the new category ID
    onChange(category.id);
    // Clear search term and close dropdown
    setSearchTerm('');
    setShowDropdown(false);
  };

  // Get selected category name
  const selectedCategory = categories.find(c => c.id === value);

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm || selectedCategory?.name || ''}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (searchTerm.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setShowDropdown(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredCategories.length > 0 ? (
            <>
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0 flex items-center"
                  onClick={() => handleCategorySelect(category)}
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-gray-500">{category.description}</div>
                    )}
                  </div>
                </button>
              ))}
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-green-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add new category
                </button>
              </div>
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No categories found. 
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                Add new category
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Category Modal */}
      <NewCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}

// New Category Modal Component
interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (category: BudgetCategory) => void;
}

function NewCategoryModal({ isOpen, onClose, onCategoryCreated }: NewCategoryModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Category modal form submitted');
    setError(null);
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating category with data:', formData);
      const category = await budgetService.createCategory({
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
        is_active: true,
        created_by: user?.id || 'current-user'
      });
      
      console.log('Category created successfully:', category);
      onCategoryCreated(category);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    } catch (error) {
      console.error('Error creating category:', error);
      setError(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={(e) => e.stopPropagation()} />

        <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">New Budget Category</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category Name *
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Color
              </label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded border border-gray-300"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                />
                <input
                  type="text"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                {loading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
