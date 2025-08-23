import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, User, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { GeneralComplianceService, GeneralComplianceRecord, CreateComplianceRecordData, UpdateComplianceRecordData } from '../services/generalComplianceService';
import { useToast } from './ui/use-toast';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';

interface GeneralComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record?: GeneralComplianceRecord;
  mode: 'create' | 'edit';
}

interface User {
  id: string;
  full_name: string;
}

interface Department {
  id: string;
  name: string;
}

export function GeneralComplianceModal({ isOpen, onClose, onSuccess, record, mode }: GeneralComplianceModalProps) {
  const [formData, setFormData] = useState<CreateComplianceRecordData>({
    name: '',
    description: '',
    complianceType: 'tax_return',
    dueDate: '',
    dueDay: undefined,
    expiryDate: '',
    renewalDate: '',
    frequency: 'once',
    status: 'active',
    priority: 'medium',
    assignedTo: '',
    departmentId: ''
  });

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadDepartments();
      
      if (mode === 'edit' && record) {
        setFormData({
          name: record.name,
          description: record.description || '',
          complianceType: record.complianceType,
          dueDate: record.dueDate,
          dueDay: record.dueDay,
          expiryDate: record.expiryDate || '',
          renewalDate: record.renewalDate || '',
          frequency: record.frequency,
          status: record.status,
          priority: record.priority,
          assignedTo: record.assignedTo || '',
          departmentId: record.departmentId || ''
        });
      } else {
        // Reset form for create mode
        setFormData({
          name: '',
          description: '',
          complianceType: 'tax_return',
          dueDate: '',
          dueDay: undefined,
          expiryDate: '',
          renewalDate: '',
          frequency: 'once',
          status: 'active',
          priority: 'medium',
          assignedTo: '',
          departmentId: ''
        });
      }
    }
  }, [isOpen, mode, record]);

  const loadUsers = async () => {
    try {
      const users = await userService.getAllUsers();
      setUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const departments = await departmentService.getAllDepartments();
      setDepartments(departments);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for the compliance record',
        variant: 'destructive'
      });
      return;
    }

    // Validate date fields based on frequency
    if (formData.frequency === 'once' && !formData.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a due date for one-time compliance items',
        variant: 'destructive'
      });
      return;
    }

    if (['monthly', 'quarterly'].includes(formData.frequency) && !formData.dueDay) {
      toast({
        title: 'Validation Error',
        description: `Please select a day of the month for ${formData.frequency} compliance items`,
        variant: 'destructive'
      });
      return;
    }

    if (['annually', 'biennially'].includes(formData.frequency) && !formData.dueDate) {
      toast({
        title: 'Validation Error',
        description: `Please select a due date for ${formData.frequency} compliance items`,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare the data to send
      const dataToSend = { ...formData };
      
      // For recurring items, calculate a proper due date if not provided
      if (['monthly', 'quarterly'].includes(formData.frequency) && formData.dueDay && !formData.dueDate) {
        const nextDueDate = GeneralComplianceService.calculateNextDueDate(formData.frequency, formData.dueDay);
        dataToSend.dueDate = nextDueDate;
      }
      
      if (mode === 'create') {
        await GeneralComplianceService.createComplianceRecord(dataToSend);
        toast({
          title: 'Success',
          description: 'Compliance record created successfully'
        });
      } else {
        if (!record) return;
        await GeneralComplianceService.updateComplianceRecord(record.id, dataToSend as UpdateComplianceRecordData);
        toast({
          title: 'Success',
          description: 'Compliance record updated successfully'
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving compliance record:', error);
      toast({
        title: 'Error',
        description: 'Failed to save compliance record',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateComplianceRecordData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const complianceTypeOptions = GeneralComplianceService.getComplianceTypeOptions();
  const frequencyOptions = GeneralComplianceService.getFrequencyOptions();
  const statusOptions = GeneralComplianceService.getStatusOptions();
  const priorityOptions = GeneralComplianceService.getPriorityOptions();

  // Helper function to check if frequency requires due day
  const requiresDueDay = (frequency: string) => ['monthly', 'quarterly'].includes(frequency);
  
  // Helper function to check if frequency requires due date
  const requiresDueDate = (frequency: string) => ['once', 'annually', 'biennially'].includes(frequency);

  // Helper function to get day suffix
  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <AlertCircle className="h-5 w-5" />
                Add New Compliance Record
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                Edit Compliance Record
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., PAYE Returns, License Renewal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the compliance requirement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compliance Type *
                </label>
                <select
                  value={formData.complianceType}
                  onChange={(e) => handleInputChange('complianceType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {complianceTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {frequencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Important Dates</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Due Date or Due Day based on frequency */}
              {requiresDueDate(formData.frequency) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Day *
                  </label>
                  <select
                    value={formData.dueDay || ''}
                    onChange={(e) => handleInputChange('dueDay', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}{getDaySuffix(day)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.frequency === 'monthly' ? 'Day of each month' : 'Day of each quarter'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renewal Date
                </label>
                <Input
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => handleInputChange('renewalDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Status & Priority</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Assignment</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => handleInputChange('departmentId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Record' : 'Update Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
