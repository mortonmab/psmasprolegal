import React, { useState } from 'react';
import { Download, ExternalLink, FileText, Image, X } from 'lucide-react';
import { Button } from './ui/button';
import { documentService } from '../services/documentService';
import type { Document } from '../lib/types';

interface DocumentPreviewProps {
  document: Document;
  onClose: () => void;
}

export function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const url = documentService.getDocumentUrl(document);
      const response = await fetch(url);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    const url = documentService.getDocumentUrl(document);
    window.open(url, '_blank');
  };

  const renderPreview = () => {
    const url = documentService.getDocumentUrl(document);
    const fileType = document.mime_type || document.file_type;

    if (fileType?.includes('image')) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <img
            src={url}
            alt={document.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden flex flex-col items-center justify-center text-center">
            <Image className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Image preview not available</p>
            <Button onClick={handleOpenInNewTab} variant="outline" size="sm" className="mt-2">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Image
            </Button>
          </div>
        </div>
      );
    }

    if (fileType?.includes('pdf')) {
      return (
        <div className="flex-1 p-4">
          <iframe
            src={url}
            className="w-full h-full border-0 rounded-lg"
            title={document.title}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden flex flex-col items-center justify-center text-center h-full">
            <FileText className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">PDF preview not available</p>
            <Button onClick={handleOpenInNewTab} variant="outline" size="sm" className="mt-2">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open PDF
            </Button>
          </div>
        </div>
      );
    }

    // For other file types, show a placeholder
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available</h3>
          <p className="mt-1 text-sm text-gray-500">
            This file type cannot be previewed in the browser
          </p>
          <div className="mt-6 space-x-3">
            <Button onClick={handleOpenInNewTab} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Document
            </Button>
            <Button onClick={handleDownload} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{document.title}</h2>
              <p className="text-sm text-gray-500">
                {document.file_name} • {documentService.formatFileSize(document.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleDownload} variant="outline" size="sm" disabled={isLoading}>
              <Download className="h-4 w-4 mr-1" />
              {isLoading ? 'Downloading...' : 'Download'}
            </Button>
            <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <span>Uploaded by {document.uploaded_by_name || 'Unknown User'}</span>
              <span className="mx-2">•</span>
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Type: {document.document_type.replace('_', ' ')}</span>
              <span>Status: {document.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
