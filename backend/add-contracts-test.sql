-- Test script to add a few contracts first
-- This will help us verify the process works before running the full script

-- Add Service Agreement contract type
INSERT INTO contract_types (id, name, description, is_active) 
VALUES (UUID(), 'Service Agreement', 'General service agreements and contracts', true)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Get the Service Agreement contract type ID
SET @service_agreement_id = (SELECT id FROM contract_types WHERE name = 'Service Agreement' LIMIT 1);

-- Get department IDs
SET @finance_dept_id = (SELECT id FROM departments WHERE name = 'Finance Department' LIMIT 1);
SET @hr_admin_dept_id = (SELECT id FROM departments WHERE name = 'HR and Admin Department' LIMIT 1);

-- Add first 5 vendors
INSERT INTO vendors (id, name, company_type, status) VALUES
(UUID(), 'CLAXON ACTUARIES', 'corporation', 'active'),
(UUID(), 'OVACODA BUSINESS SOLUTIONS', 'corporation', 'active'),
(UUID(), 'TECHSOFT TECHNOLOGIES', 'corporation', 'active'),
(UUID(), 'BAKERTILLY CHARTERED ACCOUNTANTS', 'corporation', 'active'),
(UUID(), 'HYGIENIC SERVICES', 'corporation', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add first 5 contracts
INSERT INTO contracts (id, contract_number, title, description, vendor_id, contract_type_id, department_id, start_date, end_date, status) VALUES
(UUID(), 'CON-001', 'FRS-ACTURIAL SERVICES', 'FRS-ACTURIAL SERVICES', (SELECT id FROM vendors WHERE name = 'CLAXON ACTUARIES' LIMIT 1), @service_agreement_id, @finance_dept_id, '2024-10-30', '2025-04-29', 'active'),
(UUID(), 'CON-002', 'LAPTOPS SUPPLY AND DELIVERY', 'LAPTOPS SUPPLY AND DELIVERY', (SELECT id FROM vendors WHERE name = 'OVACODA BUSINESS SOLUTIONS' LIMIT 1), @service_agreement_id, @finance_dept_id, '2023-07-07', NULL, 'active'),
(UUID(), 'CON-003', 'LAPTOPS SUPPLY AND DELIVERY', 'LAPTOPS SUPPLY AND DELIVERY', (SELECT id FROM vendors WHERE name = 'TECHSOFT TECHNOLOGIES' LIMIT 1), @service_agreement_id, @finance_dept_id, '2023-06-29', '2024-06-28', 'active'),
(UUID(), 'CON-004', '2023 AUDIT SERVICES', '2023 AUDIT SERVICES', (SELECT id FROM vendors WHERE name = 'BAKERTILLY CHARTERED ACCOUNTANTS' LIMIT 1), @service_agreement_id, @finance_dept_id, '2024-10-01', NULL, 'active'),
(UUID(), 'CON-005', 'SANITARY BINS BRANCHES', 'SANITARY BINS BRANCHES', (SELECT id FROM vendors WHERE name = 'HYGIENIC SERVICES' LIMIT 1), @service_agreement_id, @hr_admin_dept_id, '2024-06-30', '2026-06-29', 'active');

-- Display summary
SELECT 
    'Test contracts added successfully!' as message,
    COUNT(*) as total_contracts,
    COUNT(DISTINCT vendor_id) as unique_vendors
FROM contracts 
WHERE contract_number LIKE 'CON-%';
