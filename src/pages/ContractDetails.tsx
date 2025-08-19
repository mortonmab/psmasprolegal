import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  Clock,
  Calendar,
  Edit2,
  Upload,
  FileIcon,
  Download,
  PlusCircle,
  Printer,
  AlertCircle,
  DollarSign,
  History,
  Share2
} from 'lucide-react';
import { contractService } from '../services/contractService';
import { contractTypeService, ContractType } from '../services/contractTypeService';
import { departmentService } from '../services/departmentService';
import { vendorService } from '../services/vendorService';
import { documentService } from '../services/documentService';
import { ContractDocumentUploadModal } from '../components/ContractDocumentUploadModal';
import type { Contract, Department, Vendor, Document } from '../lib/types';

type TabType = 'details' | 'documents' | 'parties';

export function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractDocuments, setContractDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDocumentUploadModalOpen, setIsDocumentUploadModalOpen] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    contract_type_id: '',
    department_id: '',
    start_date: '',
    end_date: '',
    value: '',
    currency: 'USD',
    payment_terms: '',
    status: 'draft' as 'draft' | 'active' | 'expired' | 'terminated' | 'renewed'
  });

  // Fetch contract and related data
  useEffect(() => {
    const fetchContractData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [contractData, contractTypesData, departmentsData, vendorsData] = await Promise.all([
          contractService.getContractById(id),
          contractTypeService.getAllContractTypes(),
          departmentService.getAllDepartments(),
          vendorService.getAllVendors()
        ]);
        
        setContract(contractData);
        setContractTypes(contractTypesData);
        setDepartments(departmentsData);
        setVendors(vendorsData);
      } catch (err) {
        console.error('Error fetching contract data:', err);
        setError('Failed to load contract details');
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, [id]);

  // Load contract documents when documents tab is active
  useEffect(() => {
    if (id && activeTab === 'documents') {
      loadContractDocuments();
    }
  }, [id, activeTab]);

  const loadContractDocuments = async () => {
    if (!id) return;
    
    try {
      setDocumentsLoading(true);
      const documents = await documentService.getContractDocuments(id);
      setContractDocuments(documents);
    } catch (error) {
      console.error('Error loading contract documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentUploadSuccess = (document: Document) => {
    setContractDocuments(prev => [document, ...prev]);
    setSelectedDocument(document);
  };

  const handleEditClick = () => {
    if (contract) {
      setEditFormData({
        title: contract.title,
        description: contract.description || '',
        contract_type_id: contract.contract_type_id || '',
        department_id: contract.department_id || '',
        start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
        end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
        value: contract.value || '',
        currency: contract.currency || 'USD',
        payment_terms: contract.payment_terms || '',
        status: contract.status
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!contract || !id) return;

    setEditLoading(true);
    try {
      const updatedContract = await contractService.updateContract(id, {
        title: editFormData.title,
        description: editFormData.description || null,
        contract_type_id: editFormData.contract_type_id || null,
        department_id: editFormData.department_id || null,
        start_date: editFormData.start_date || null,
        end_date: editFormData.end_date || null,
        value: editFormData.value || null,
        currency: editFormData.currency,
        payment_terms: editFormData.payment_terms || null,
        status: editFormData.status
      });

      setContract(updatedContract);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating contract:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Contract not found</h2>
          <p className="mt-2 text-gray-600">{error || 'The contract you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/contracts')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'details', name: 'Contract Details', icon: FileText },
    { id: 'documents', name: 'Documents', icon: FileIcon },
    { id: 'parties', name: 'Parties', icon: Users }
  ];

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    {isEditing ? (
                      // Edit form
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Title *</label>
                            <input
                              type="text"
                              value={editFormData.title}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                            <select
                              value={editFormData.contract_type_id}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, contract_type_id: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Contract Type</option>
                              {contractTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                              value={editFormData.department_id}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, department_id: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Department</option>
                              {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={editFormData.status}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="expired">Expired</option>
                              <option value="terminated">Terminated</option>
                              <option value="renewed">Renewed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={editFormData.start_date}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={editFormData.end_date}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
                            <input
                              type="text"
                              value={editFormData.value}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, value: e.target.value }))}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <select
                              value={editFormData.currency}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, currency: e.target.value }))}
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                          <input
                            type="text"
                            value={editFormData.payment_terms}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                            placeholder="e.g., Net 30"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            placeholder="Enter contract description..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            onClick={handleSaveEdit}
                            disabled={editLoading || !editFormData.title.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {editLoading ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={editLoading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display details
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Contract Type</h3>
                            <p className="mt-1 text-sm text-gray-900">
                              {contractTypes.find(ct => ct.id === contract.contract_type_id)?.name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Status</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              contract.status === 'active' ? 'bg-green-100 text-green-800' : 
                              contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                              contract.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {contract.status}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Contract Value</h3>
                            <p className="mt-1 text-sm text-gray-900">
                              {contract.value ? `${contract.currency || 'USD'} ${contract.value}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                            <p className="mt-1 text-sm text-gray-900">
                              {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'} 
                              {contract.end_date && ` to ${new Date(contract.end_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Department</h3>
                            <p className="mt-1 text-sm text-gray-900">
                              {departments.find(d => d.id === contract.department_id)?.name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Contract Number</h3>
                            <p className="mt-1 text-sm text-gray-900">{contract.contract_number}</p>
                          </div>
                        </div>

                        {contract.description && (
                          <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
                            <p className="text-sm text-gray-900">{contract.description}</p>
                          </div>
                        )}
                        
                        {(contract.payment_terms || contract.value) && (
                          <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-3">Contract Terms</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {contract.payment_terms && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Payment Terms</p>
                                  <p className="mt-1 text-sm text-gray-900">{contract.payment_terms}</p>
                                </div>
                              )}
                              {contract.value && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Contract Value</p>
                                  <p className="mt-1 text-sm text-gray-900">{contract.currency || 'USD'} {contract.value}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={handleEditClick}
                      className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Contract Documents</h3>
                <button 
                  onClick={() => setIsDocumentUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </button>
              </div>
              
              {documentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading documents...</div>
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* Documents List Sidebar */}
                  <div className="w-1/3 border-r border-gray-200 pr-6">
                    <div className="flex flex-col space-y-4">
                      {contractDocuments.length > 0 ? (
                        contractDocuments.map((document) => (
                          <div
                            key={document.id}
                            className="flex items-start p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors duration-150 hover:bg-blue-50"
                            onClick={() => setSelectedDocument(document)}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-lg">{documentService.getFileIcon(document.file_type)}</span>
                              </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {document.title}
                              </p>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span>{document.document_type.replace('_', ' ')}</span>
                                <span className="mx-2">•</span>
                                <span>{documentService.formatFileSize(document.file_size)}</span>
                              </div>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span>Uploaded by {document.uploaded_by_name || 'Unknown User'}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(document.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="ml-2 flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(documentService.getDocumentUrl(document), '_blank');
                                }}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm">No documents available.</div>
                      )}
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="w-2/3">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 h-[90vh] flex flex-col">
                      {selectedDocument ? (
                        <>
                          {/* Preview Header - Hidden for PDFs */}
                          {!selectedDocument.mime_type?.includes('pdf') && (
                            <div className="border-b border-gray-200 bg-white rounded-t-lg px-6 py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {selectedDocument.title}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    Uploaded by {selectedDocument.uploaded_by_name || 'Unknown User'} on {new Date(selectedDocument.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <button 
                                    onClick={() => window.open(documentService.getDocumentUrl(selectedDocument), '_blank')}
                                    className="text-gray-400 hover:text-gray-500"
                                  >
                                    <Download className="h-5 w-5" />
                                  </button>
                                  <button 
                                    onClick={() => setSelectedDocument(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Preview Content */}
                          <div className="flex-1 overflow-hidden">
                            {(() => {
                              const url = documentService.getDocumentUrl(selectedDocument);
                              const fileType = selectedDocument.mime_type || selectedDocument.file_type;

                              if (fileType?.includes('image')) {
                                return (
                                  <div className="flex-1 flex items-center justify-center p-4">
                                    <img
                                      src={url}
                                      alt={selectedDocument.title}
                                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden flex flex-col items-center justify-center text-center">
                                      <span className="text-4xl mb-2">🖼️</span>
                                      <p className="text-sm text-gray-500">Image preview not available</p>
                                      <button 
                                        onClick={() => window.open(url, '_blank')}
                                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 hover:text-blue-700"
                                      >
                                        Open Image
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              if (fileType?.includes('pdf')) {
                                return (
                                  <iframe
                                    src={url}
                                    className="w-full h-full border-0"
                                    title={selectedDocument.title}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                );
                              }

                              // For other file types, show a placeholder with download option
                              return (
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center">
                                    <span className="text-6xl mb-4 block">{documentService.getFileIcon(selectedDocument.file_type)}</span>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available</h3>
                                    <p className="mt-1 text-sm text-gray-500 mb-4">
                                      This file type cannot be previewed in the browser
                                    </p>
                                    <div className="space-x-3">
                                      <button 
                                        onClick={() => window.open(url, '_blank')}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 hover:text-blue-700"
                                      >
                                        Open Document
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = selectedDocument.file_name;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 hover:text-gray-800"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No document selected</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Select a document from the list to preview
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );



      case 'parties':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900">Contract Vendors</h3>
                <p className="text-sm text-gray-500">Parties involved in this contract</p>
              </div>
              
              {(() => {
                const contractVendors = [];
                
                // Add vendors from vendor_ids array
                if (contract.vendor_ids && Array.isArray(contract.vendor_ids)) {
                  contract.vendor_ids.forEach(vendorId => {
                    const vendor = vendors.find(v => v.id === vendorId);
                    if (vendor) {
                      contractVendors.push(vendor);
                    }
                  });
                }
                
                // Add vendor from vendor_id if not already included
                if (contract.vendor_id) {
                  const vendor = vendors.find(v => v.id === contract.vendor_id);
                  if (vendor && !contractVendors.find(v => v.id === vendor.id)) {
                    contractVendors.push(vendor);
                  }
                }
                
                if (contractVendors.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This contract doesn't have any vendors assigned yet.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {contractVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                      >
                        <div className="flex-shrink-0">
                          <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {vendor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="focus:outline-none">
                            <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                            <p className="text-sm text-gray-500">{vendor.company_type}</p>
                            {vendor.contact_person && (
                              <p className="text-sm text-gray-500">Contact: {vendor.contact_person}</p>
                            )}
                            {vendor.email && (
                              <p className="text-sm text-gray-500">{vendor.email}</p>
                            )}
                            {vendor.phone && (
                              <p className="text-sm text-gray-500">{vendor.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Contracts
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{contract.title}</h1>
              <p className="mt-2 text-sm text-gray-700">
                Contract Number: {contract.contract_number}
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Printer className="h-4 w-4 mr-2" />
                Generate Report
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Share2 className="h-4 w-4 mr-2" />
                Share Contract
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={classNames(
                  tab.id === activeTab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm'
                )}
              >
                <Icon className={classNames(
                  tab.id === activeTab ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                  '-ml-0.5 mr-2 h-5 w-5'
                )} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Document Upload Modal */}
      <ContractDocumentUploadModal
        isOpen={isDocumentUploadModalOpen}
        onClose={() => setIsDocumentUploadModalOpen(false)}
        onUploadSuccess={handleDocumentUploadSuccess}
        contractId={id || ''}
      />
    </div>
  );
} 