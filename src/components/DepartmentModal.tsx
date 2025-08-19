import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import { departmentService } from '../services/departmentService';
import type { Department } from '../lib/types';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
  onSuccess: () => void;
}

export function DepartmentModal({ isOpen, onClose, department, onSuccess }: DepartmentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    head_user_id: '',
    email: '',
    phone: ''
  });

  const isEditing = !!department;

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        head_user_id: department.description || '', // Department head is stored in description field
        email: department.email || '',
        phone: department.phone || ''
      });
    } else {
      setFormData({
        name: '',
        head_user_id: '',
        email: '',
        phone: ''
      });
    }
  }, [department, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Department name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && department) {
        await departmentService.updateDepartment(department.id, formData);
        toast({
          title: "Success",
          description: "Department updated successfully"
        });
      } else {
        await departmentService.createDepartment({
          ...formData,
          status: 'active'
        });
        toast({
          title: "Success",
          description: "Department created successfully"
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: "Error",
        description: "Failed to save department. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Department' : 'Add New Department'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter department name"
              required
            />
          </div>

          <div>
            <Label htmlFor="head_user_id">Department Head</Label>
            <Input
              id="head_user_id"
              value={formData.head_user_id}
              onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}
              placeholder="Enter department head name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="department@company.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Department' : 'Create Department')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
