import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';
import { contractTypeService, ContractType } from '../services/contractTypeService';

interface ContractTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractType?: ContractType | null;
  onSuccess: () => void;
}

export function ContractTypeModal({ isOpen, onClose, contractType, onSuccess }: ContractTypeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const isEditing = !!contractType;

  useEffect(() => {
    if (contractType) {
      setFormData({
        name: contractType.name || '',
        description: contractType.description || '',
        color: contractType.color || '#3B82F6'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
  }, [contractType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Contract type name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && contractType) {
        await contractTypeService.updateContractType(contractType.id, formData);
        toast({
          title: "Success",
          description: "Contract type updated successfully"
        });
      } else {
        await contractTypeService.createContractType({
          ...formData,
          is_active: true
        });
        toast({
          title: "Success",
          description: "Contract type created successfully"
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving contract type:', error);
      toast({
        title: "Error",
        description: "Failed to save contract type. Please try again.",
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
            {isEditing ? 'Edit Contract Type' : 'Add New Contract Type'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Contract Type Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter contract type name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter contract type description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center space-x-3">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 p-1 border rounded"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Contract Type' : 'Create Contract Type')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
