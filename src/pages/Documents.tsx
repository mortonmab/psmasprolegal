import React, { useState, useEffect } from 'react';
import { FileText, Download, Share2, Clock, Upload, Printer } from 'lucide-react';
import type { Document } from '../lib/types';
import { useToast } from '../components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/apiService';

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    } catch (error) {
      toast({
        title: 'Error fetching documents',
        description: error instanceof Error ? error.message : 'Failed to fetch documents',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('uploaded_by', user.id);
      
      await apiService.post('/documents/upload', formData);
      toast({ title: 'Upload successful', description: file.name });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Upload error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
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

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all legal documents including contracts, motions, and evidence files.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
          />
          <button
            type="button"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload document'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Documents List Sidebar */}
        <div className="w-1/3 bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex flex-col space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className={`flex items-start p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors duration-150 hover:bg-blue-50 ${
                    selectedDocument?.id === document.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedDocument(document)}
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
                      <span>{document.file_type}</span>
                      <span className="mx-2">•</span>
                      <span>{document.file_size} MB</span>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Modified {document.updated_at}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        document.status === 'Final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {document.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                        Uploaded by {selectedDocument.uploaded_by} • Last modified {selectedDocument.updated_at}
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
                  {/* This is a placeholder for the actual document preview */}
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      Preview not available. Click to open in a new tab.
                    </p>
                    <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      Open Document
                    </button>
                  </div>
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
    </div>
  );
}