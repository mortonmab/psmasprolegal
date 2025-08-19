import { X, Plus, X as XIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { contractService } from '../services/contractService';
import type { Contract } from '../lib/types';
import { contractTypeService, ContractType } from '../services/contractTypeService';
import { departmentService } from '../services/departmentService';
import { vendorService } from '../services/vendorService';
import type { Department, Vendor } from '../lib/types';
import { useToast } from './ui/use-toast';
import { ContractVendorModal } from './ContractVendorModal';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contract: Contract) => void;
}

export function NewContractModal({ isOpen, onClose, onContractCreated }: NewContractModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    contract_type_id: '',
    vendor_ids: [] as string[],
    value: '',
    status: 'active' as 'active' | 'expired' | 'draft' | 'terminated' | 'renewed',
    startDate: '',
    expiryDate: '',
    department_id: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Fetch contract types, departments, and vendors when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [contractTypesData, departmentsData, vendorsData] = await Promise.all([
            contractTypeService.getAllContractTypes(),
            departmentService.getAllDepartments(),
            vendorService.getAllVendors()
          ]);
          setContractTypes(contractTypesData);
          setDepartments(departmentsData);
          setVendors(vendorsData);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast({
            title: "Error",
            description: "Failed to load contract types, departments, and vendors",
            variant: "destructive"
          });
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Handle click outside to close vendor dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.vendor-dropdown-container')) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title || !formData.contract_type_id || !formData.startDate || !formData.department_id) {
      setFormError('Please fill in all required fields (Contract Title, Type, Start Date, and Department).');
      return;
    }
    setLoading(true);
    try {
      const contract = await contractService.createContract({
        contract_number: `CON-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        title: formData.title,
        contract_type_id: formData.contract_type_id,
        vendor_ids: formData.vendor_ids,
        value: formData.value,
        status: formData.status,
        start_date: formData.startDate,
        end_date: formData.expiryDate,
        department_id: formData.department_id,
        description: formData.description,
      });
      setFormData({
        title: '',
        contract_type_id: '',
        vendor_ids: [],
        value: '',
        status: 'active' as 'active' | 'expired' | 'draft' | 'terminated' | 'renewed',
        startDate: '',
        expiryDate: '',
        department_id: '',
        description: '',
      });
      toast({
        title: 'Contract Created',
        description: 'The contract was successfully created.',
      });
      if (onContractCreated) onContractCreated(contract);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">New Contract</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {formError && (
              <div className="text-red-500 text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Title *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={loading || loadingData}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type *</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.contract_type_id}
                  onChange={e => setFormData(prev => ({ ...prev, contract_type_id: e.target.value }))}
                  disabled={loading || loadingData}
                >
                  <option value="">Select Contract Type</option>
                  {contractTypes.map(contractType => (
                    <option key={contractType.id} value={contractType.id}>
                      {contractType.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Vendor(s)</label>
                <div className="relative vendor-dropdown-container">
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[42px]">
                    {formData.vendor_ids.map(vendorId => {
                      const vendor = vendors.find(v => v.id === vendorId);
                      return vendor ? (
                        <span
                          key={vendorId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                        >
                          {vendor.name}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              vendor_ids: prev.vendor_ids.filter(id => id !== vendorId)
                            }))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Search vendors..."
                        className="w-full border-none outline-none text-sm"
                        value={vendorSearchTerm}
                        onChange={(e) => setVendorSearchTerm(e.target.value)}
                        onFocus={() => setShowVendorDropdown(true)}
                        disabled={loading || loadingData}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVendorModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md hover:bg-green-200"
                      disabled={loading || loadingData}
                    >
                      <Plus className="h-3 w-3" />
                      Add New
                    </button>
                  </div>
                  
                  {showVendorDropdown && vendorSearchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {vendors
                        .filter(vendor => 
                          vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) &&
                          !formData.vendor_ids.includes(vendor.id)
                        )
                        .map(vendor => (
                          <button
                            key={vendor.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                vendor_ids: [...prev.vendor_ids, vendor.id]
                              }));
                              setVendorSearchTerm('');
                              setShowVendorDropdown(false);
                            }}
                          >
                            {vendor.name}
                          </button>
                        ))}
                      {vendors.filter(vendor => 
                        vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) &&
                        !formData.vendor_ids.includes(vendor.id)
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No vendors found. Click "Add New" to create one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Value</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.value}
                  onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  disabled={loading || loadingData}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'expired' | 'draft' | 'terminated' | 'renewed' }))}
                  disabled={loading || loadingData}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="draft">Draft</option>
                  <option value="terminated">Terminated</option>
                  <option value="renewed">Renewed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  disabled={loading || loadingData}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.expiryDate}
                  onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  disabled={loading || loadingData}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.department_id}
                  onChange={e => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                  disabled={loading || loadingData}
                >
                  <option value="">Select Department</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Vendor Modal */}
      <ContractVendorModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onVendorCreated={(newVendor) => {
          setVendors(prev => [...prev, newVendor]);
          setFormData(prev => ({
            ...prev,
            vendor_ids: [...prev.vendor_ids, newVendor.id]
          }));
        }}
      />
    </div>
  );
} 