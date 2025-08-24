import { X, Plus, Scale } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCases } from '../hooks/useCases';
import { lawFirmService } from '../services/lawFirmService';
import { LawFirm } from '../lib/types';
import { NewLawFirmModal } from './NewLawFirmModal';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Department {
  id: string;
  name: string;
  head?: string;
  email?: string;
}

export function NewCaseModal({ isOpen, onClose }: NewCaseModalProps) {
  const { createCase } = useCases();
  const [formData, setFormData] = useState<{
    case_name: string;
    case_type: 'civil' | 'criminal' | 'family' | 'corporate' | 'employment' | 'other';
    status: 'open' | 'pending' | 'closed' | 'archived';
    filing_date: string;
    description: string;
    law_firm_id: string;
  }>({
    case_name: '',
    case_type: 'civil',
    status: 'open',
    filing_date: '',
    description: '',
    law_firm_id: ''
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loadingLawFirms, setLoadingLawFirms] = useState(false);
  const [showNewLawFirmModal, setShowNewLawFirmModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingDepartments(true);
      setLoadingLawFirms(true);
      
      // Load departments
      const mockDepartments: Department[] = [
        { id: '1', name: 'Legal Department' },
        { id: '2', name: 'HR Department' },
        { id: '3', name: 'Finance Department' },
        { id: '4', name: 'IT Department' }
      ];
      setDepartments(mockDepartments);
      setLoadingDepartments(false);

      // Load law firms
      loadLawFirms();
    }
  }, [isOpen]);

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
    } finally {
      setLoadingLawFirms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCase({
        case_number: `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        case_name: formData.case_name,
        case_type: formData.case_type || 'civil',
        status: formData.status,
        description: formData.description,
        priority: 'medium',
        filing_date: formData.filing_date || undefined,
        law_firm_id: formData.law_firm_id || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error creating case:', error);
    }
  };

  const handleLawFirmCreated = (newLawFirm: LawFirm) => {
    setLawFirms(prev => [...prev, newLawFirm]);
    setFormData(prev => ({ ...prev, law_firm_id: newLawFirm.id }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">New Case</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Case Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.case_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, case_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Case Type
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.case_type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    case_type: e.target.value as 'civil' | 'criminal' | 'family' | 'corporate' | 'employment' | 'other'
                  }))}
                >
                  <option value="civil">Civil</option>
                  <option value="criminal">Criminal</option>
                  <option value="family">Family</option>
                  <option value="corporate">Corporate</option>
                  <option value="employment">Employment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Law Firm
                </label>
                <div className="mt-1 flex">
                  <select
                    className="block w-full rounded-l-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formData.law_firm_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, law_firm_id: e.target.value }))}
                    disabled={loadingLawFirms}
                  >
                    <option value="">Select Law Firm...</option>
                    {lawFirms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name} {firm.firm_type === 'in_house' ? '(In House)' : '(External)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewLawFirmModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-700 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Add new law firm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {loadingLawFirms && (
                  <p className="mt-1 text-sm text-gray-500">Loading law firms...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    status: e.target.value as 'open' | 'pending' | 'closed' | 'archived' 
                  }))}
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.filing_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, filing_date: e.target.value }))}
                />
              </div>



            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Case Description
              </label>
              <textarea
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Case
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Law Firm Modal */}
      <NewLawFirmModal
        isOpen={showNewLawFirmModal}
        onClose={() => setShowNewLawFirmModal(false)}
        onLawFirmCreated={handleLawFirmCreated}
      />
    </div>
  );
}
