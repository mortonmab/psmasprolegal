import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { contractService } from '../services/contractService';
import { vendorService } from '../services/vendorService';
import { departmentService } from '../services/departmentService';
import { contractTypeService } from '../services/contractTypeService';
import type { Vendor, Department, ContractType } from '../lib/types';

interface ContractUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  details?: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
}

export function ContractUploadModal({ isOpen, onClose, onUploadSuccess }: ContractUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data for validation
  React.useEffect(() => {
    if (isOpen) {
      loadReferenceData();
    }
  }, [isOpen]);

  const loadReferenceData = async () => {
    try {
      const [vendorsData, departmentsData, contractTypesData] = await Promise.all([
        vendorService.getAllVendors(),
        departmentService.getAllDepartments(),
        contractTypeService.getAllContractTypes()
      ]);
      setVendors(vendorsData);
      setDepartments(departmentsData);
      setContractTypes(contractTypesData);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        alert('Please select a valid Excel file (.xlsx, .xls) or CSV file');
        return;
      }
      
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template with headers and example data
    const headers = [
      'Title',
      'Description',
      'Vendor Name',
      'Contract Type',
      'Status',
      'Start Date',
      'End Date',
      'Value',
      'Currency',
      'Payment Terms',
      'Department Name'
    ];

    const exampleData = [
      'Software License Agreement',
      'Annual software license for office productivity tools',
      'Microsoft Corporation',
      'Service Agreement',
      'active',
      '2024-01-01',
      '2024-12-31',
      '50000',
      'USD',
      'Net 30',
      'IT Department'
    ];

    const csvContent = [
      headers.join(','),
      exampleData.join(','),
      'Consulting Services,Legal consulting services,ABC Law Firm,Consulting Agreement,active,2024-02-01,2024-08-31,25000,USD,Net 45,Legal Department'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'contracts-upload-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await contractService.uploadContracts(formData);
      setUploadResult(result);
      
      if (result.success) {
        onUploadSuccess();
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Upload failed. Please check your file format and try again.',
        details: {
          total: 0,
          successful: 0,
          failed: 1,
          errors: ['Upload failed']
        }
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-600" />
              Upload Contracts
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Template Download Section */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-blue-900">Download Template</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Use our template to ensure your data is formatted correctly. All fields marked with * are required.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Required Fields Info */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-900">Required Fields</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• <strong>Title:</strong> Contract title/name</li>
                  <li>• <strong>Vendor Name:</strong> Must match an existing vendor in the system</li>
                  <li>• <strong>Contract Type:</strong> Must match an existing contract type</li>
                  <li>• <strong>Status:</strong> draft, active, expired, terminated, or renewed</li>
                          <li>• <strong>Start Date:</strong> Format: DD/MM/YYYY (e.g., 01/01/2024)</li>
        <li>• <strong>End Date:</strong> Format: DD/MM/YYYY (e.g., 31/12/2024) (optional)</li>
                  <li>• <strong>Department Name:</strong> Must match an existing department</li>
                </ul>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Excel (.xlsx, .xls) or CSV files up to 10MB
                </p>
              </div>
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`mb-6 p-4 rounded-lg border ${
              uploadResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    uploadResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    uploadResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.details && (
                    <div className="mt-2 text-sm">
                      <p>Total: {uploadResult.details.total}</p>
                      <p>Successful: {uploadResult.details.successful}</p>
                      <p>Failed: {uploadResult.details.failed}</p>
                      {uploadResult.details.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {uploadResult.details.errors.map((error, index) => (
                              <li key={index} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Contracts
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
