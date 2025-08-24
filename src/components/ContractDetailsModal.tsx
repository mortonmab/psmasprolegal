import React, { useState, useEffect } from 'react';
import { X, Calendar, Building, DollarSign, FileText, User, AlertTriangle, CheckCircle, Settings, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Contract, Vendor, Department } from '../lib/types';
import { contractService } from '../services/contractService';
import { vendorService } from '../services/vendorService';
import { contractTypeService, ContractType } from '../services/contractTypeService';
import { departmentService } from '../services/departmentService';

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
}

export function ContractDetailsModal({ isOpen, onClose, contractId }: ContractDetailsModalProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [contractType, setContractType] = useState<ContractType | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      loadContractDetails();
    }
  }, [isOpen, contractId]);

  const loadContractDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load contract details
      const contractData = await contractService.getContract(contractId);
      setContract(contractData);

      // Load vendor details if vendor_id exists
      if (contractData.vendor_id) {
        try {
          const vendorData = await vendorService.getVendor(contractData.vendor_id);
          setVendor(vendorData);
        } catch (vendorError) {
          console.warn('Failed to load vendor details:', vendorError);
          setVendor(null);
        }
      } else {
        setVendor(null);
      }

      // Load contract type details if contract_type_id exists
      if (contractData.contract_type_id) {
        try {
          const contractTypeData = await contractTypeService.getContractTypeById(contractData.contract_type_id);
          setContractType(contractTypeData);
        } catch (contractTypeError) {
          console.warn('Failed to load contract type details:', contractTypeError);
          setContractType(null);
        }
      } else {
        setContractType(null);
      }

      // Load department details if department_id exists
      if (contractData.department_id) {
        try {
          const departmentData = await departmentService.getDepartmentById(contractData.department_id);
          setDepartment(departmentData);
        } catch (departmentError) {
          console.warn('Failed to load department details:', departmentError);
          setDepartment(null);
        }
      } else {
        setDepartment(null);
      }
    } catch (err) {
      console.error('Failed to load contract details:', err);
      setError('Failed to load contract details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-gray-100 text-gray-800';
      case 'renewed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'expired': 
      case 'terminated': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value?: string, currency?: string) => {
    if (!value) return 'Not specified';
    const amount = parseFloat(value);
    if (isNaN(amount)) return value;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    const today = new Date();
    const expiryDate = new Date(endDate);
    const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff > 0;
  };

  const isExpired = (endDate?: string) => {
    if (!endDate) return false;
    const today = new Date();
    const expiryDate = new Date(endDate);
    return expiryDate < today;
  };

  const handleManageContract = () => {
    // Navigate to the contract details/edit page
    window.location.href = `/contracts/${contractId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Contract Details</h3>
            <p className="text-sm text-gray-500">View contract information and status</p>
          </div>
          <div className="flex items-center space-x-3">
            {contract && (
              <button
                onClick={handleManageContract}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Contract
                <ExternalLink className="h-3 w-3 ml-1" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading contract details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {contract && !loading && (
            <div className="space-y-6">
              {/* Contract Overview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900">{contract.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">Contract #{contract.contract_number}</p>
                    {contract.description && (
                      <p className="text-gray-700 mt-2">{contract.description}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                      {getStatusIcon(contract.status)}
                      <span className="ml-1 capitalize">{contract.status}</span>
                    </span>
                    {isExpiringSoon(contract.end_date) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiring Soon
                      </span>
                    )}
                    {isExpired(contract.end_date) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contract Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Contract Information
                  </h5>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contract Number</dt>
                      <dd className="text-sm text-gray-900">{contract.contract_number}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="text-sm text-gray-900">{contract.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900 capitalize">{contract.status}</dd>
                    </div>
                    {contractType && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Type</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          {contractType.color && (
                            <span 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: contractType.color }}
                            ></span>
                          )}
                          {contractType.name}
                          {contractType.description && (
                            <span className="text-xs text-gray-500 ml-2">- {contractType.description}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {department && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Department</dt>
                        <dd className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{department.name}</span>
                            {department.description && (
                              <span className="text-xs text-gray-500 ml-2">- {department.description}</span>
                            )}
                          </div>
                          {department.email && (
                            <div className="text-xs text-gray-500 mt-1">
                              Email: {department.email}
                            </div>
                          )}
                          {department.phone && (
                            <div className="text-xs text-gray-500">
                              Phone: {department.phone}
                            </div>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Dates */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Important Dates
                  </h5>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="text-sm text-gray-900">{formatDate(contract.start_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">End Date</dt>
                      <dd className="text-sm text-gray-900">{formatDate(contract.end_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{formatDate(contract.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">{formatDate(contract.updated_at)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Financial Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Financial Details
                  </h5>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contract Value</dt>
                      <dd className="text-sm text-gray-900">{formatCurrency(contract.value, contract.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Currency</dt>
                      <dd className="text-sm text-gray-900">{contract.currency || 'USD'}</dd>
                    </div>
                    {contract.payment_terms && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                        <dd className="text-sm text-gray-900">{contract.payment_terms}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Vendor Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Vendor Information
                  </h5>
                  {vendor ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                        <dd className="text-sm text-gray-900">{vendor.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Type</dt>
                        <dd className="text-sm text-gray-900 capitalize">{vendor.company_type?.replace('_', ' ')}</dd>
                      </div>
                      {vendor.contact_person && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                          <dd className="text-sm text-gray-900">{vendor.contact_person}</dd>
                        </div>
                      )}
                      {vendor.email && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">{vendor.email}</dd>
                        </div>
                      )}
                      {vendor.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="text-sm text-gray-900">{vendor.phone}</dd>
                        </div>
                      )}
                      {vendor.address && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="text-sm text-gray-900">
                            {vendor.address}
                            {vendor.city && `, ${vendor.city}`}
                            {vendor.state && `, ${vendor.state}`}
                            {vendor.postal_code && ` ${vendor.postal_code}`}
                            {vendor.country && `, ${vendor.country}`}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">No vendor information available</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {contract.description && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Description</h5>
                  <p className="text-gray-700 whitespace-pre-wrap">{contract.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
