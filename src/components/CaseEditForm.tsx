import React, { useState, useEffect } from 'react';
import { X, Save, Building, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import apiService from '../services/apiService';
import { lawFirmService } from '../services/lawFirmService';
import type { Case, LawFirm } from '../lib/types';
import { NewLawFirmModal } from './NewLawFirmModal';

interface CaseEditFormProps {
  caseData: Case;
  onSave: (updatedCase: Case) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

export function CaseEditForm({ caseData, onSave, onCancel, loading = false }: CaseEditFormProps) {
  const [formData, setFormData] = useState({
    case_name: caseData.case_name || '',
    case_type: caseData.case_type || '',
    description: caseData.description || '',
    priority: caseData.priority || 'medium',
    status: caseData.status || 'open',
    department_id: caseData.department_id || '',
    law_firm_id: caseData.law_firm_id || '',
    client_name: caseData.client_name || '',
    case_number: caseData.case_number || '',
    filing_date: caseData.filing_date || '',
    court_name: caseData.court_name || '',
    judge_name: caseData.judge_name || '',
    opposing_counsel: caseData.opposing_counsel || '',
    estimated_value: caseData.estimated_value || '',
    notes: caseData.notes || ''
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [showNewLawFirmModal, setShowNewLawFirmModal] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDepartments();
    loadLawFirms();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await apiService.get<Department[]>('/departments');
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
      setError('Failed to load departments');
    }
  };

  const loadLawFirms = async () => {
    try {
      const firms = await lawFirmService.getAllLawFirms();
      
      // Add "In House" as the first option if it doesn't exist
      const inHouseFirm: LawFirm = {
        id: 'in-house',
        name: 'In House',
        firm_type: 'in_house',
        status: 'active',
        created_at: '',
        updated_at: ''
      };
      
      const hasInHouse = firms.some(firm => firm.firm_type === 'in_house');
      const allFirms = hasInHouse ? firms : [inHouseFirm, ...firms];
      
      setLawFirms(allFirms);
    } catch (error) {
      console.error('Error loading law firms:', error);
      // Fallback to just In House option
      setLawFirms([{
        id: 'in-house',
        name: 'In House',
        firm_type: 'in_house',
        status: 'active',
        created_at: '',
        updated_at: ''
      }]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLawFirmCreated = (newLawFirm: LawFirm) => {
    setLawFirms(prev => [...prev, newLawFirm]);
    setFormData(prev => ({ ...prev, law_firm_id: newLawFirm.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('Submitting form data:', formData);

    try {
      // Remove any undefined or empty string values that might cause issues
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => value !== undefined && value !== '')
      );
      
      console.log('Clean form data:', cleanFormData);
      
      const updatedCase = await apiService.put<Case>(`/cases/${caseData.id}`, cleanFormData);
      onSave(updatedCase);
    } catch (error) {
      console.error('Error updating case:', error);
      if (error.response?.data?.details) {
        setError(`Failed to update case: ${error.response.data.details}`);
      } else {
        setError('Failed to update case. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="case_name">Case Name</Label>
            <Input
              id="case_name"
              value={formData.case_name}
              onChange={(e) => handleInputChange('case_name', e.target.value)}
              placeholder="Enter case name"
              required
            />
          </div>
          <div>
            <Label htmlFor="case_number">Case Number</Label>
            <Input
              id="case_number"
              value={formData.case_number}
              onChange={(e) => handleInputChange('case_number', e.target.value)}
              placeholder="Enter case number"
            />
          </div>
          <div>
            <Label htmlFor="case_type">Case Type</Label>
            <Select value={formData.case_type} onValueChange={(value) => handleInputChange('case_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select case type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="civil">Civil</SelectItem>
                <SelectItem value="criminal">Criminal</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="employment">Employment</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => handleInputChange('client_name', e.target.value)}
              placeholder="Enter client name"
            />
          </div>
        </div>
      </div>

      {/* Department Assignment */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Department Assignment
        </h3>
        <div>
          <Label htmlFor="department">Department</Label>
          <Select value={formData.department_id} onValueChange={(value) => handleInputChange('department_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {departments.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No departments available. Contact an administrator to create departments.</p>
          )}
        </div>
      </div>

      {/* Law Firm Assignment */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Law Firm Assignment
        </h3>
        <div>
          <Label htmlFor="law_firm">Law Firm</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.law_firm_id} 
              onValueChange={(value) => handleInputChange('law_firm_id', value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select law firm" />
              </SelectTrigger>
              <SelectContent>
                {lawFirms.map((firm) => (
                  <SelectItem key={firm.id} value={firm.id}>
                    {firm.name} {firm.firm_type === 'in_house' ? '(In House)' : '(External)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewLawFirmModal(true)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {lawFirms.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No law firms available. Click the + button to add a new law firm.</p>
          )}
        </div>
      </div>

      {/* Case Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Case Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filing_date">Filing Date</Label>
            <Input
              id="filing_date"
              type="date"
              value={formData.filing_date}
              onChange={(e) => handleInputChange('filing_date', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="estimated_value">Estimated Value</Label>
            <Input
              id="estimated_value"
              value={formData.estimated_value}
              onChange={(e) => handleInputChange('estimated_value', e.target.value)}
              placeholder="Enter estimated value"
            />
          </div>
        </div>
      </div>

      {/* Court Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Court Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="court_name">Court Name</Label>
            <Input
              id="court_name"
              value={formData.court_name}
              onChange={(e) => handleInputChange('court_name', e.target.value)}
              placeholder="Enter court name"
            />
          </div>
          <div>
            <Label htmlFor="judge_name">Judge Name</Label>
            <Input
              id="judge_name"
              value={formData.judge_name}
              onChange={(e) => handleInputChange('judge_name', e.target.value)}
              placeholder="Enter judge name"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="opposing_counsel">Opposing Counsel</Label>
            <Input
              id="opposing_counsel"
              value={formData.opposing_counsel}
              onChange={(e) => handleInputChange('opposing_counsel', e.target.value)}
              placeholder="Enter opposing counsel"
            />
          </div>
        </div>
      </div>

      {/* Description and Notes */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Description & Notes</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter case description"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter additional notes"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            console.log('Testing simple update...');
            try {
              const testData = { case_name: 'Test Update' };
              const result = await apiService.put<Case>(`/cases/${caseData.id}`, testData);
              console.log('Test update successful:', result);
            } catch (error) {
              console.error('Test update failed:', error);
            }
          }}
          disabled={loading}
        >
          Test Update
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* New Law Firm Modal */}
      <NewLawFirmModal
        isOpen={showNewLawFirmModal}
        onClose={() => setShowNewLawFirmModal(false)}
        onLawFirmCreated={handleLawFirmCreated}
      />
    </form>
  );
}
