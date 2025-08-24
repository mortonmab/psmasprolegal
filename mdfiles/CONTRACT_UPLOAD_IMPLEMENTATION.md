# Contract Upload Feature Implementation

## Overview
This document describes the implementation of a bulk contract upload feature that allows users to upload Excel (.xlsx, .xls) or CSV files containing contract data directly into the system.

## Features Implemented

### 1. Frontend Components

#### ContractUploadModal Component
- **Location**: `src/components/ContractUploadModal.tsx`
- **Features**:
  - File upload interface with drag-and-drop support
  - Template download functionality
  - File type validation (.xlsx, .xls, .csv)
  - Progress indication and error handling
  - Detailed upload results display

#### Updated Contracts Page
- **Location**: `src/pages/Contracts.tsx`
- **Changes**:
  - Added "Upload" button next to "New contract" button
  - Integrated ContractUploadModal component
  - Automatic data refresh after successful upload

### 2. Backend API

#### Upload Endpoint
- **Endpoint**: `POST /api/contracts/upload`
- **Location**: `backend/server.ts`
- **Features**:
  - File upload handling with multer middleware
  - Support for Excel (.xlsx, .xls) and CSV files
  - Comprehensive data validation
  - Bulk insert with error handling
  - Detailed response with success/failure statistics

#### File Parsing
- **CSV Parser**: Custom implementation for CSV files
- **Excel Parser**: Using xlsx library for Excel files
- **Data Normalization**: Converts headers to lowercase with underscores

### 3. Data Validation

#### Required Fields
- Title*
- Vendor Name* (must exist in vendors table)
- Contract Type* (must exist in contract_types table)
- Status* (draft, active, expired, terminated, renewed)
- Start Date* (YYYY-MM-DD format)
- Department Name* (must exist in departments table)

#### Optional Fields
- Description
- End Date (YYYY-MM-DD format)
- Value
- Currency (defaults to USD)
- Payment Terms



#### Validation Rules
- Date format validation (YYYY-MM-DD)
- Status value validation
- Vendor existence check
- Contract type existence check
- Department existence check
- Contract number auto-generation (CON-YYYY-XXX format)

## Usage Instructions

### 1. Accessing the Upload Feature
1. Navigate to the Contracts page
2. Click the "Upload" button next to "New contract"
3. The upload modal will open

### 2. Downloading the Template
1. In the upload modal, click "Download Template"
2. A CSV file with sample data will be downloaded
3. Use this template as a starting point for your data

### 3. Preparing Your Data
1. Open the downloaded template in Excel or a text editor
2. Replace the sample data with your actual contract information
3. Ensure all required fields are filled
4. Verify that vendor names, contract types, and department names match existing records
5. Save as CSV or Excel format

### 4. Uploading Your File
1. Click "Upload a file" or drag and drop your file
2. Select your prepared file
3. Click "Upload Contracts"
4. Review the upload results
5. Close the modal when complete

## File Format Requirements

### CSV Format
```csv
Title*,Description,Vendor Name*,Contract Type*,Status*,Start Date*,End Date,Value,Currency,Payment Terms,Department Name*
Software License Agreement,Annual software license,Microsoft Corporation,Service Agreement,active,2024-01-01,2024-12-31,50000,USD,Net 30,IT Department
```

### Excel Format
- First row must contain headers
- Headers should match the CSV format
- Data should start from the second row
- Supported formats: .xlsx, .xls

## Error Handling

### Common Errors and Solutions

1. **"Vendor not found"**
   - Ensure vendor name exactly matches existing vendor in the system
   - Check for typos or extra spaces

2. **"Contract type not found"**
   - Verify contract type name matches existing types
   - Common types: Service Agreement, Consulting Agreement, Lease Agreement, Insurance Policy

3. **"Department not found"**
   - Check department name spelling
   - Common departments: IT Department, Legal Department, Finance Department, Facilities Department

4. **"Invalid date format"**
   - Use YYYY-MM-DD format (e.g., 2024-01-01)
   - Avoid MM/DD/YYYY or DD/MM/YYYY formats
   - End date is optional and can be left empty

5. **"Contract number auto-generated"**
   - Contract numbers are automatically generated in CON-YYYY-XXX format
   - No need to provide contract numbers in the upload file

6. **"Invalid status"**
   - Valid statuses: draft, active, expired, terminated, renewed
   - Use lowercase letters

## Technical Implementation Details

### Frontend Dependencies
- React hooks for state management
- Lucide React for icons
- FormData API for file upload

### Backend Dependencies
- multer for file upload handling
- xlsx for Excel file parsing
- MySQL for data storage

### Database Requirements
- vendors table with name field
- contract_types table with name field
- departments table with name field
- contracts table with all required fields

## Security Considerations

1. **File Size Limits**: 10MB maximum file size
2. **File Type Validation**: Only Excel and CSV files accepted
3. **Data Validation**: All input data is validated before database insertion
4. **SQL Injection Prevention**: Using parameterized queries
5. **Error Handling**: Detailed error messages without exposing system internals

## Performance Considerations

1. **Bulk Processing**: Multiple contracts processed in a single request
2. **Transaction Handling**: Each contract insertion is handled individually
3. **Memory Management**: Files are processed as buffers to avoid disk I/O
4. **Error Recovery**: Failed contracts don't prevent successful ones from being inserted

## Future Enhancements

1. **Excel Template**: Provide downloadable Excel template with formulas and validation
2. **Batch Processing**: Process large files in background jobs
3. **Data Preview**: Show preview of parsed data before upload
4. **Mapping Interface**: Allow users to map custom column headers
5. **Update Mode**: Support updating existing contracts via upload
6. **Export Errors**: Download detailed error report for failed uploads

## Testing

### Manual Testing Checklist
- [ ] Upload CSV file with valid data
- [ ] Upload Excel file with valid data
- [ ] Test with missing required fields
- [ ] Test with invalid vendor names
- [ ] Test with invalid contract types
- [ ] Test with invalid department names
- [ ] Test with duplicate contract numbers
- [ ] Test with invalid date formats
- [ ] Test with invalid status values
- [ ] Test file size limits
- [ ] Test file type validation

### Sample Test Data
The implementation includes sample data in the template file:
- `backend/contracts-upload-template.csv`

## Support

For issues or questions regarding the contract upload feature:
1. Check the error messages in the upload results
2. Verify your data format matches the template
3. Ensure all referenced entities (vendors, contract types, departments) exist in the system
4. Review the validation rules and requirements
