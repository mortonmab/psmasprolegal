import React, { useState, useEffect } from 'react';
import { FileText, Download, Share2, Clock, Upload, Printer, Folder, Filter, Search, ChevronRight } from 'lucide-react';
import type { Document } from '../lib/types';
import { useToast } from '../components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/apiService';
import { GeneralDocumentUploadModal } from '../components/GeneralDocumentUploadModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Document['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'folders'>('folders');
  const [breadcrumb, setBreadcrumb] = useState<string>('All Documents');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDocuments();
  }, [user, navigate]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const response = await apiService.get<Document[]>('/documents');
      setDocuments(response);
      setFilteredDocuments(response);
    } catch (error) {
      toast({
        title: 'Error fetching documents',
        description: error instanceof Error ? error.message : 'Failed to fetch documents',
        variant: 'destructive',
      });
    }
  };

  // Filter documents by category and search query
  useEffect(() => {
    let filtered = documents;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(doc => 
        doc.title?.toLowerCase().includes(query) ||
        doc.file_name?.toLowerCase().includes(query) ||
        doc.file_type?.toLowerCase().includes(query) ||
        doc.uploaded_by_name?.toLowerCase().includes(query) ||
        doc.uploaded_by?.toLowerCase().includes(query)
      );
    }
    
    setFilteredDocuments(filtered);
  }, [documents, selectedCategory, searchQuery]);

  const handleUploadSuccess = (document: Document) => {
    toast({ title: 'Upload successful', description: document.title });
    fetchDocuments();
  };

  const handleDownload = async (document: Document) => {
    try {
      if (!document.file_url) throw new Error('No file URL available');
      window.open(document.file_url, '_blank');
    } catch (error) {
      toast({
        title: 'Error downloading document',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  // Helper function to check if file type is previewable
  const isPreviewable = (fileType: string) => {
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];
    return previewableTypes.includes(fileType);
  };

  // Helper function to get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('word') || fileType.includes('document')) return '📄';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    return '📄';
  };

  // Helper function to get full file URL
  const getFullFileUrl = (fileUrl: string) => {
    if (!fileUrl) return '';
    // If it's already a full URL, return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Otherwise, construct the full URL using the backend base URL
    return `http://localhost:3000${fileUrl}`;
  };

  // Handle opening document in new tab
  const handleOpenDocument = (document: Document) => {
    if (!document.file_url) {
      toast({
        title: 'Error opening document',
        description: 'No file URL available',
        variant: 'destructive',
      });
      return;
    }
    const fullUrl = getFullFileUrl(document.file_url);
    window.open(fullUrl, '_blank');
  };

  // Handle preview error
  const handlePreviewError = (document: Document) => {
    setPreviewError(`Unable to preview ${document.title}. The file may be corrupted or the format is not supported.`);
    toast({
      title: 'Preview Error',
      description: `Unable to preview ${document.title}. The file may be corrupted or the format is not supported.`,
      variant: 'destructive',
    });
  };

  // Handle iframe load error
  const handleIframeError = (document: Document) => {
    console.log('Iframe failed to load, trying fallback');
    // For text files, we can try to fetch the content directly
    if (document.file_type?.includes('text')) {
      fetch(getFullFileUrl(document.file_url))
        .then(response => response.text())
        .then(text => {
          // Create a text preview element
          const previewArea = document.querySelector('.preview-area');
          if (previewArea) {
            previewArea.innerHTML = `<pre class="text-sm text-gray-800 whitespace-pre-wrap overflow-auto h-full">${text}</pre>`;
          }
        })
        .catch(error => {
          console.error('Failed to load text content:', error);
          handlePreviewError(document);
        });
    } else {
      handlePreviewError(document);
    }
  };

  // Handle document selection
  const handleDocumentSelect = (document: Document) => {
    console.log('Document selected:', document);
    console.log('File URL:', document.file_url);
    console.log('Full URL:', getFullFileUrl(document.file_url));
    setSelectedDocument(document);
    setPreviewLoading(true);
    setPreviewError(null);
    // Simulate loading time for preview
    setTimeout(() => setPreviewLoading(false), 500);
  };

  // Helper function to get category display name
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'cases': 'Cases',
      'contracts': 'Contracts',
      'title_deeds': 'Title Deeds',
      'policies': 'Policies',
      'frameworks': 'Frameworks',
      'correspondences': 'Correspondences',
      'board_minutes': 'Board Minutes',
      'management_minutes': 'Management Minutes',
      'sops': 'SOPS',
      'governance': 'Governance Documents',
      'other': 'Other'
    };
    return categoryMap[category] || category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get documents by category
  const getDocumentsByCategory = () => {
    const categories = documents.reduce((acc, doc) => {
      const category = doc.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);
    
    return categories;
  };

  // Get category counts
  const getCategoryCounts = () => {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      const category = doc.category || 'uncategorized';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  };

  // Handle category selection
  const handleCategorySelect = (category: Document['category'] | 'all') => {
    setSelectedCategory(category);
    if (category === 'all') {
      setBreadcrumb('All Documents');
    } else {
      setBreadcrumb(getCategoryDisplayName(category));
    }
  };

  // Handle back to all documents
  const handleBackToAll = () => {
    setSelectedCategory('all');
    setBreadcrumb('All Documents');
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all legal documents organized by categories.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            disabled={isUploading}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('folders')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'folders' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Folders
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {/* Category Filter (for list view) */}
            {viewMode === 'list' && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Category:</span>
                <Select value={selectedCategory} onValueChange={(value: Document['category'] | 'all') => handleCategorySelect(value)}>
                  <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="cases">Cases</SelectItem>
              <SelectItem value="contracts">Contracts</SelectItem>
              <SelectItem value="title_deeds">Title Deeds</SelectItem>
              <SelectItem value="policies">Policies</SelectItem>
              <SelectItem value="frameworks">Frameworks</SelectItem>
              <SelectItem value="correspondences">Correspondences</SelectItem>
                    <SelectItem value="board_minutes">Board Minutes</SelectItem>
              <SelectItem value="management_minutes">Management Minutes</SelectItem>
              <SelectItem value="sops">SOPS</SelectItem>
              <SelectItem value="governance">Governance Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Documents List Sidebar */}
        <div className="w-1/3 bg-white shadow rounded-lg">
          <div className="p-6">
                         {viewMode === 'folders' ? (
               // Folder View
               <div className="space-y-4">
                 {/* Breadcrumb Navigation */}
                 <div className="flex items-center space-x-2 text-sm text-gray-600">
                   <button
                     onClick={handleBackToAll}
                     className="hover:text-blue-600 transition-colors"
                   >
                     All Documents
                   </button>
                   {selectedCategory !== 'all' && (
                     <>
                       <span>/</span>
                       <span className="text-gray-900 font-medium">{breadcrumb}</span>
                     </>
                   )}
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <h3 className="text-lg font-medium text-gray-900">
                     {selectedCategory === 'all' ? 'Folders' : breadcrumb}
                   </h3>
                   <span className="text-sm text-gray-500">{filteredDocuments.length} documents</span>
                 </div>
                
                {searchQuery.trim() ? (
                  // Search Results View
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 mb-3">
                      Search results for "{searchQuery}"
                    </div>
                    {filteredDocuments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="mx-auto h-8 w-8 text-gray-300" />
                        <p className="mt-2 text-sm">No documents found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredDocuments.map((document) => (
                          <div
                            key={document.id}
                            className={`flex items-start p-3 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors duration-150 hover:bg-blue-50 ${
                              selectedDocument?.id === document.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => handleDocumentSelect(document)}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {document.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {getCategoryDisplayName(document.category || 'uncategorized')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Folder Structure View
                  <div className="space-y-2">
                    {Object.entries(getDocumentsByCategory()).map(([category, docs]) => {
                      const categoryDocs = docs.filter(doc => 
                        !searchQuery.trim() || 
                        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      
                      if (categoryDocs.length === 0) return null;
                      
                      return (
                        <div key={category} className="border border-gray-200 rounded-lg">
                                                     <div
                             className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                             onClick={() => handleCategorySelect(category as Document['category'])}
                           >
                            <div className="flex items-center space-x-2">
                              <Folder className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">
                                {getCategoryDisplayName(category)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">{categoryDocs.length} docs</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          
                          {selectedCategory === category && (
                            <div className="border-t border-gray-200 p-2 space-y-1">
                              {categoryDocs.map((document) => (
                                <div
                                  key={document.id}
                                  className={`flex items-start p-2 rounded-md hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
                                    selectedDocument?.id === document.id ? 'bg-blue-50' : ''
                                  }`}
                                  onClick={() => handleDocumentSelect(document)}
                                >
                                  <div className="flex-shrink-0">
                                    <div className="h-6 w-6 rounded bg-blue-100 flex items-center justify-center">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">
                                      {document.title}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {document.file_type || 'Unknown'} • {document.file_size ? `${document.file_size} MB` : 'Unknown size'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // List View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <span className="text-sm text-gray-500">{filteredDocuments.length} documents</span>
                </div>
                
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm">No documents found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`flex items-start p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors duration-150 hover:bg-blue-50 ${
                    selectedDocument?.id === document.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                        onClick={() => handleDocumentSelect(document)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {document.title}
                    </p>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span>{document.file_type || 'Unknown'}</span>
                      <span className="mx-2">•</span>
                            <span>{document.file_size ? `${document.file_size} MB` : 'Unknown size'}</span>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                            <span>Modified {document.updated_at || 'Unknown'}</span>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              document.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                              {document.status || 'Unknown'}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                        <Folder className="h-3 w-3 mr-1" />
                              {document.category ? document.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Uncategorized'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Preview */}
        <div className="w-2/3">
          <div className="bg-white shadow rounded-lg h-[600px] flex flex-col">
            {selectedDocument ? (
              <>
                {/* Preview Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {selectedDocument.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Uploaded by {selectedDocument.uploaded_by_name || selectedDocument.uploaded_by} • Last modified {selectedDocument.updated_at}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button className="text-gray-400 hover:text-gray-500">
                        <Share2 className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => selectedDocument && handleDownload(selectedDocument)}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-500">
                        <Printer className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 p-6 bg-gray-50 flex items-center justify-center">
                  {previewLoading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading preview...</p>
                    </div>
                  ) : previewError ? (
                    <div className="text-center">
                      <div className="text-red-500 mb-4">
                        <FileText className="mx-auto h-12 w-12" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Error</h3>
                      <p className="text-sm text-gray-500 mb-4">{previewError}</p>
                      <button
                        onClick={() => handleOpenDocument(selectedDocument)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Open Document
                      </button>
                    </div>
                  ) : isPreviewable(selectedDocument.file_type || '') ? (
                    <div className="w-full h-full flex flex-col">
                      {/* Preview Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{getFileIcon(selectedDocument.file_type || '')}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {selectedDocument.file_type || 'Unknown type'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenDocument(selectedDocument)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Open in New Tab
                        </button>
                      </div>
                      
                      {/* Preview Area */}
                      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {selectedDocument.file_type?.includes('pdf') ? (
                          <iframe
                            src={`${getFullFileUrl(selectedDocument.file_url)}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full"
                            title={selectedDocument.title}
                            onError={() => handlePreviewError(selectedDocument)}
                            onLoad={() => console.log('PDF loaded successfully')}
                          />
                        ) : selectedDocument.file_type?.includes('image') ? (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <img
                              src={getFullFileUrl(selectedDocument.file_url)}
                              alt={selectedDocument.title}
                              className="max-w-full max-h-full object-contain"
                              onError={() => handlePreviewError(selectedDocument)}
                            />
                          </div>
                        ) : selectedDocument.file_type?.includes('text') ? (
                          <div className="w-full h-full p-4 preview-area">
                            <iframe
                              src={getFullFileUrl(selectedDocument.file_url)}
                              className="w-full h-full border-0"
                              title={selectedDocument.title}
                              onError={() => handleIframeError(selectedDocument)}
                              onLoad={() => console.log('Text file loaded successfully')}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                              <div className="text-4xl mb-2">{getFileIcon(selectedDocument.file_type || '')}</div>
                              <p className="text-sm text-gray-500 mb-4">
                                Preview not available for this file type
                              </p>
                              <button
                                onClick={() => handleOpenDocument(selectedDocument)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                      Open Document
                    </button>
                  </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-2">{getFileIcon(selectedDocument.file_type || '')}</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {selectedDocument.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        This file type cannot be previewed directly
                      </p>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleOpenDocument(selectedDocument)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Open Document
                        </button>
                        <div className="text-xs text-gray-400">
                          File type: {selectedDocument.file_type || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
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

      {/* Upload Modal */}
      <GeneralDocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}