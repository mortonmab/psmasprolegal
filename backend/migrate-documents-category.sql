-- Migration script to add category column to documents table
-- Run this script to update existing documents table

-- Add category column to documents table
ALTER TABLE documents 
ADD COLUMN category ENUM('cases', 'contracts', 'title_deeds', 'policies', 'frameworks', 'correspondences', 'board_minutes', 'management_minutes', 'sops', 'governance', 'other') NOT NULL DEFAULT 'other' AFTER document_type;

-- Add index for category column
ALTER TABLE documents 
ADD INDEX idx_category (category);

-- Update existing documents to have appropriate categories based on their context
-- Documents with case_id should be categorized as 'cases'
UPDATE documents SET category = 'cases' WHERE case_id IS NOT NULL;

-- Documents with contract_id should be categorized as 'contracts'  
UPDATE documents SET category = 'contracts' WHERE contract_id IS NOT NULL;

-- Documents with document_type 'contract' should be categorized as 'contracts' if not already set
UPDATE documents SET category = 'contracts' WHERE document_type = 'contract' AND category = 'other';

-- Documents with document_type 'correspondence' should be categorized as 'correspondences' if not already set
UPDATE documents SET category = 'correspondences' WHERE document_type = 'correspondence' AND category = 'other';
