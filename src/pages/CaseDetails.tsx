import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  Edit2,
  Upload,
  FileIcon,
  Download,
  PlusCircle,
  Printer,
  AlertCircle,
  X,
  Lock,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { caseService } from '../services/caseService';
import { documentService } from '../services/documentService';
import { lawFirmService } from '../services/lawFirmService';
import { NewCaseUpdateModal } from '../components/NewCaseUpdateModal';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { CaseAssignmentModal } from '../components/CaseAssignmentModal';
import { CaseEditForm } from '../components/CaseEditForm';
import { CloseCaseModal } from '../components/CloseCaseModal';
import { useAuth } from '../hooks/useAuth';
import { useCases } from '../hooks/useCases';

import type { Case, CaseUpdate, Document, LawFirm } from '../lib/types';

type TabType = 'details' | 'updates' | 'documents' | 'collaborators';

export function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userCases } = useCases();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [caseDetails, setCaseDetails] = useState<Case | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDocumentUploadModalOpen, setIsDocumentUploadModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [lawFirm, setLawFirm] = useState<LawFirm | null>(null);
  const [lawFirmLoading, setLawFirmLoading] = useState(false);
  const [isCloseCaseModalOpen, setIsCloseCaseModalOpen] = useState(false);
  const [closeCaseLoading, setCloseCaseLoading] = useState(false);

  // Check if user can edit this case (collaborator)
  const canEditCase = () => {
    if (!user || !caseDetails) return false;
    return userCases.some(uc => uc.id === caseDetails.id);
  };

  // Check if user is an administrator
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Handle assignment success
  const handleAssignmentSuccess = () => {
    // Refresh the case details to show updated assignments
    if (id) {
      caseService.getCaseById(id)
        .then(data => {
          const previousLawFirmId = caseDetails?.law_firm_id;
          setCaseDetails(data);
          // Reload law firm if it changed
          if (data.law_firm_id !== previousLawFirmId) {
            if (data.law_firm_id) {
              loadLawFirm(data.law_firm_id);
            } else {
              setLawFirm(null);
            }
          }
        })
        .catch(err => console.error('Error refreshing case details:', err));
    }
  };

  // Handle case update
  const handleCaseUpdate = async (updatedCase: Case) => {
    setEditLoading(true);
    try {
      setCaseDetails(updatedCase);
      setIsEditing(false);
      // Reload law firm if it changed
      if (updatedCase.law_firm_id !== caseDetails?.law_firm_id) {
        if (updatedCase.law_firm_id) {
          loadLawFirm(updatedCase.law_firm_id);
        } else {
          setLawFirm(null);
        }
      }
    } catch (error) {
      console.error('Error updating case:', error);
    } finally {
      setEditLoading(false);
    }
  };

  // Load law firm data
  const loadLawFirm = async (lawFirmId: string) => {
    setLawFirmLoading(true);
    try {
      const lawFirmData = await lawFirmService.getLawFirmById(lawFirmId);
      setLawFirm(lawFirmData);
    } catch (error) {
      console.error('Error loading law firm:', error);
      setLawFirm(null);
    } finally {
      setLawFirmLoading(false);
    }
  };

  // Handle close case
  const handleCloseCase = async (reason: string) => {
    if (!caseDetails || !id) return;
    
    setCloseCaseLoading(true);
    try {
      // Update case status to closed
      const updatedCase = await caseService.updateCase(id, {
        status: 'closed',
        actual_completion_date: new Date().toISOString().split('T')[0]
      });
      
      // Create a case update entry for the closure
      await caseService.createCaseUpdate(id, {
        user_id: user?.id || '',
        update_type: 'status_change',
        title: 'Case Closed',
        content: `Case was closed. Reason: ${reason}`
      });
      
      setCaseDetails(updatedCase);
      setIsCloseCaseModalOpen(false);
      
      // Show success message (you might want to add a toast notification here)
      console.log('Case closed successfully');
      
    } catch (error) {
      console.error('Error closing case:', error);
      // Show error message (you might want to add a toast notification here)
    } finally {
      setCloseCaseLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      caseService.getCaseById(id)
        .then(data => {
          setCaseDetails(data);
          // Load law firm if case has one assigned
          if (data.law_firm_id) {
            loadLawFirm(data.law_firm_id);
          }
        })
        .catch(err => setError(err instanceof Error ? err : new Error('Failed to load case')))
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'updates') {
      loadCaseUpdates();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === 'documents') {
      loadCaseDocuments();
    }
  }, [id, activeTab]);

  const loadCaseUpdates = async () => {
    if (!id) return;
    
    setUpdatesLoading(true);
    try {
      const updates = await caseService.getCaseUpdates(id);
      setCaseUpdates(updates);
    } catch (error) {
      console.error('Error loading case updates:', error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const loadCaseDocuments = async () => {
    if (!id) return;
    
    setDocumentsLoading(true);
    try {
      const documents = await documentService.getCaseDocuments(id);
      setCaseDocuments(documents);
    } catch (error) {
      console.error('Error loading case documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleCreateUpdate = async (update: {
    user_id: string;
    update_type: CaseUpdate['update_type'];
    title: string;
    content?: string;
  }) => {
    if (!id) return;
    
    try {
      const newUpdate = await caseService.createCaseUpdate(id, update);
      setCaseUpdates(prev => [newUpdate, ...prev]);
    } catch (error) {
      console.error('Error creating case update:', error);
      throw error;
    }
  };

  const handleDocumentUpload = async (document: Document) => {
    setCaseDocuments(prev => [document, ...prev]);
  };



  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading case details.</div>;
  if (!caseDetails) return <div>Case not found.</div>;

  const tabs = [
    { id: 'details', name: 'Case Details', icon: FileText },
    { id: 'updates', name: 'Updates', icon: MessageSquare },
    { id: 'documents', name: 'Documents', icon: FileIcon },
    { id: 'collaborators', name: 'Collaborators', icon: Users }
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
                      <CaseEditForm
                        caseData={caseDetails}
                        onSave={handleCaseUpdate}
                        onCancel={() => setIsEditing(false)}
                        loading={editLoading}
                      />
                    ) : (
                      // Display details
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Client</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.client_name || caseDetails.case_name}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Case Type</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.case_type}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Status</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              caseDetails.status === 'open' ? 'bg-green-100 text-green-800' : 
                              caseDetails.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              caseDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {caseDetails.status}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              caseDetails.priority === 'high' ? 'bg-red-100 text-red-800' : 
                              caseDetails.priority === 'urgent' ? 'bg-purple-100 text-purple-800' :
                              caseDetails.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {caseDetails.priority}
                            </span>
                          </div>
                          {caseDetails.filing_date && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Filing Date</h3>
                              <p className="mt-1 text-sm text-gray-900">{new Date(caseDetails.filing_date).toLocaleDateString()}</p>
                            </div>
                          )}
                          {caseDetails.estimated_value && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Estimated Value</h3>
                              <p className="mt-1 text-sm text-gray-900">{caseDetails.estimated_value}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Law Firm Section */}
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                            <Building2 className="h-4 w-4 mr-2" />
                            Legal Counsel
                          </h3>
                          {lawFirmLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm text-gray-500">Loading law firm...</span>
                            </div>
                          ) : lawFirm ? (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">{lawFirm.name}</h4>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                    lawFirm.firm_type === 'in_house' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {lawFirm.firm_type === 'in_house' ? 'In-House Legal Team' : 'External Law Firm'}
                                  </span>
                                </div>
                                <div className={`p-2 rounded-lg ${lawFirm.firm_type === 'in_house' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                  <Building2 className={`h-5 w-5 ${lawFirm.firm_type === 'in_house' ? 'text-blue-600' : 'text-purple-600'}`} />
                                </div>
                              </div>
                              
                              {(lawFirm.contact_person || lawFirm.email || lawFirm.phone || lawFirm.website) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {lawFirm.contact_person && (
                                    <div className="flex items-center space-x-2">
                                      <Users className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">{lawFirm.contact_person}</span>
                                    </div>
                                  )}
                                  {lawFirm.email && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="h-4 w-4 text-gray-400" />
                                      <a href={`mailto:${lawFirm.email}`} className="text-blue-600 hover:text-blue-800">
                                        {lawFirm.email}
                                      </a>
                                    </div>
                                  )}
                                  {lawFirm.phone && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <a href={`tel:${lawFirm.phone}`} className="text-blue-600 hover:text-blue-800">
                                        {lawFirm.phone}
                                      </a>
                                    </div>
                                  )}
                                  {lawFirm.website && (
                                    <div className="flex items-center space-x-2">
                                      <Globe className="h-4 w-4 text-gray-400" />
                                      <a href={lawFirm.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                        {lawFirm.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {lawFirm.specializations && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 mb-1">Specializations</h5>
                                  <p className="text-sm text-gray-900">{lawFirm.specializations}</p>
                                </div>
                              )}
                            </div>
                          ) : caseDetails.law_firm_id ? (
                            <div className="text-sm text-red-600">
                              Law firm information unavailable
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              No law firm assigned to this case
                            </div>
                          )}
                        </div>

                        {caseDetails.description && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Description</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.description}</p>
                          </div>
                        )}
                        {caseDetails.court_name && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Court</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.court_name}</p>
                          </div>
                        )}
                        {caseDetails.judge_name && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Judge</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.judge_name}</p>
                          </div>
                        )}
                        {caseDetails.opposing_counsel && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Opposing Counsel</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.opposing_counsel}</p>
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Assigned Members</h3>
                          <p className="mt-1 text-sm text-gray-900">
                            {caseDetails.assigned_members || 'No members assigned'}
                          </p>
                        </div>
                        {caseDetails.notes && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                            <p className="mt-1 text-sm text-gray-900">{caseDetails.notes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {canEditCase() ? (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="ml-4 flex items-center text-gray-400">
                      <Lock className="h-4 w-4 mr-1" />
                      <span className="text-xs">View Only</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'updates':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Case Updates</h3>
                {canEditCase() ? (
                  <button 
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Update
                  </button>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <Lock className="h-4 w-4 mr-1" />
                    <span className="text-sm">View Only</span>
                  </div>
                )}
              </div>
              
              {updatesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading updates...</div>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {caseUpdates.length > 0 ? (
                      caseUpdates.map((update, updateIdx) => (
                        <li key={update.id}>
                          <div className="relative pb-8">
                            {updateIdx !== caseUpdates.length - 1 && (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                  <MessageSquare className="h-5 w-5 text-white" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <p className="text-sm font-medium text-gray-900">{update.title}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      update.update_type === 'status_change' ? 'bg-purple-100 text-purple-800' :
                                      update.update_type === 'assignment' ? 'bg-blue-100 text-blue-800' :
                                      update.update_type === 'document_added' ? 'bg-green-100 text-green-800' :
                                      update.update_type === 'court_date' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {update.update_type.replace('_', ' ')}
                                    </span>
                                  </div>
                                  {update.content && (
                                    <p className="text-sm text-gray-700 mb-1">{update.content}</p>
                                  )}
                                  <p className="text-sm text-gray-500">By {update.full_name || 'Unknown User'}</p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {new Date(update.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 text-sm">No updates available.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Case Documents</h3>
                {canEditCase() ? (
                  <button 
                    onClick={() => setIsDocumentUploadModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </button>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <Lock className="h-4 w-4 mr-1" />
                    <span className="text-sm">View Only</span>
                  </div>
                )}
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
                      {caseDocuments.length > 0 ? (
                        caseDocuments.map((document) => (
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

      case 'collaborators':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Case Collaborators</h3>
                {(isAdmin() || canEditCase()) && (
                  <button 
                    onClick={() => setIsAssignmentModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Collaborator
                  </button>
                )}
              </div>
              
              {caseDetails.assigned_members ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {caseDetails.assigned_members.split(', ').map((assignment, index) => {
                    const [name, role] = assignment.split(' (');
                    const cleanRole = role ? role.replace(')', '') : 'Unknown Role';
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <div
                        key={index}
                        className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                      >
                        <div className="flex-shrink-0">
                          <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {initials}
                            </span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          <p className="text-sm text-gray-500 truncate">{cleanRole}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {cleanRole.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No collaborators</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding collaborators to this case.
                  </p>
                  {(isAdmin() || canEditCase()) && (
                    <div className="mt-6">
                      <button
                        onClick={() => setIsAssignmentModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Collaborator
                      </button>
                    </div>
                  )}
                </div>
              )}
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
            onClick={() => navigate('/cases')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cases
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{caseDetails.case_name}</h1>
              <p className="mt-2 text-sm text-gray-700">
                Case Number: {caseDetails.case_number}
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Printer className="h-4 w-4 mr-2" />
                Generate Report
              </button>
              {(isAdmin() || canEditCase()) && (
                <button 
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Assignments
                </button>
              )}
              {caseDetails.status === 'open' && canEditCase() && (
                <button 
                  onClick={() => setIsCloseCaseModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Warning */}
      {!canEditCase() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Lock className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                View Only Access
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have view-only access to this case. To edit, make updates, or upload documents, 
                  you need to be assigned to this case or invited as a collaborator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Case Update Modal */}
      {id && (
        <NewCaseUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          onSubmit={handleCreateUpdate}
          caseId={id}
        />
      )}

      {/* Document Upload Modal */}
      {id && (
        <DocumentUploadModal
          isOpen={isDocumentUploadModalOpen}
          onClose={() => setIsDocumentUploadModalOpen(false)}
          onUploadSuccess={handleDocumentUpload}
          caseId={id}
        />
      )}

      {/* Case Assignment Modal */}
      {id && caseDetails && (
        <CaseAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          caseId={id}
          caseName={caseDetails.case_name}
          onAssignmentSuccess={handleAssignmentSuccess}
          isAdmin={isAdmin()}
        />
      )}

      {/* Close Case Modal */}
      {id && caseDetails && (
        <CloseCaseModal
          isOpen={isCloseCaseModalOpen}
          onClose={() => setIsCloseCaseModalOpen(false)}
          onConfirm={handleCloseCase}
          caseName={caseDetails.case_name}
          loading={closeCaseLoading}
        />
      )}

    </div>
  );
} 