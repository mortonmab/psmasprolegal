import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../hooks/useAuth';
import { documentService } from '../services/documentService';
import type { Document } from '../lib/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (document: Document) => void;
  caseId: string;
}

export function DocumentUploadModal({ isOpen, onClose, onUploadSuccess, caseId }: DocumentUploadModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<Document['document_type']>('evidence');
  const [category, setCategory] = useState<Document['category']>('cases');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, and images are allowed.');
        setSelectedFile(null);
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
      
      // Auto-fill title if not already set
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove file extension
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !title.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      const document = await documentService.uploadDocument(
        caseId,
        selectedFile,
        title.trim(),
        documentType,
        category,
        user.id
      );
      
      // Reset form
      setTitle('');
      setDocumentType('evidence');
      setCategory('cases');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onUploadSuccess(document);
      onClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setTitle('');
      setDocumentType('evidence');
      setCategory('cases');
      setSelectedFile(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
              <p className="text-sm text-gray-500">Case #{caseId}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Document File *</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                id="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                className="hidden"
                disabled={isUploading}
              />
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isUploading}
                  >
                    Choose a file
                  </button>
                  <p className="text-sm text-gray-500">or drag and drop</p>
                </div>
                {selectedFile && (
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800 font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {documentService.formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={(value: Document['document_type']) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evidence">Evidence</SelectItem>
                <SelectItem value="correspondence">Correspondence</SelectItem>
                <SelectItem value="court_filing">Court Filing</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value: Document['category']) => setCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cases">Cases</SelectItem>
                <SelectItem value="contracts">Contracts</SelectItem>
                <SelectItem value="title_deeds">Title Deeds</SelectItem>
                <SelectItem value="policies">Policies</SelectItem>
                <SelectItem value="frameworks">Frameworks</SelectItem>
                <SelectItem value="correspondences">Correspondences</SelectItem>
                <SelectItem value="board_minutes">Board Minutes and Terms of References</SelectItem>
                <SelectItem value="management_minutes">Management Minutes</SelectItem>
                <SelectItem value="sops">SOPS</SelectItem>
                <SelectItem value="governance">Governance Documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                className="pl-10"
                required
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isUploading || !selectedFile || !title.trim()}
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
