import apiService from './apiService';
import type { Document } from '../lib/types';

export const documentService = {
  async getAllDocuments(): Promise<Document[]> {
    return await apiService.get<Document[]>('/documents');
  },

  async getCaseDocuments(caseId: string): Promise<Document[]> {
    return await apiService.get<Document[]>(`/cases/${caseId}/documents`);
  },

  async getContractDocuments(contractId: string): Promise<Document[]> {
    return await apiService.get<Document[]>(`/contracts/${contractId}/documents`);
  },

  async uploadDocument(
    caseId: string, 
    file: File, 
    title: string, 
    documentType: Document['document_type'],
    category: Document['category'],
    uploadedBy: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('document_type', documentType);
    formData.append('category', category);
    formData.append('uploaded_by', uploadedBy);

    return await apiService.post<Document>(`/cases/${caseId}/documents/upload`, formData);
  },

  async uploadContractDocument(
    contractId: string, 
    file: File, 
    title: string, 
    documentType: Document['document_type'],
    category: Document['category'],
    uploadedBy: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('document_type', documentType);
    formData.append('category', category);
    formData.append('uploaded_by', uploadedBy);

    return await apiService.post<Document>(`/contracts/${contractId}/documents/upload`, formData);
  },

  async uploadGeneralDocument(
    file: File, 
    title: string, 
    documentType: Document['document_type'],
    category: Document['category'],
    uploadedBy: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('document_type', documentType);
    formData.append('category', category);
    formData.append('uploaded_by', uploadedBy);

    return await apiService.post<Document>(`/documents/upload`, formData);
  },

  async deleteDocument(documentId: string): Promise<void> {
    await apiService.delete(`/documents/${documentId}`);
  },

  getDocumentUrl(document: Document): string {
    if (document.file_url) {
      // If it's a relative URL, prepend the API base URL
      if (document.file_url.startsWith('/')) {
        return `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${document.file_url}`;
      }
      return document.file_url;
    }
    return '';
  },

  getFileIcon(fileType: string): string {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📄';
    return '📎';
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};
