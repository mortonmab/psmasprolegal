-- Seed departments table with sample data
INSERT INTO departments (id, name, description, status) VALUES
('dept-001', 'Corporate Law', 'Handles corporate legal matters, mergers, acquisitions, and business law', 'active'),
('dept-002', 'Civil Litigation', 'Handles civil disputes, personal injury, and general litigation', 'active'),
('dept-003', 'Criminal Defense', 'Handles criminal cases and defense representation', 'active'),
('dept-004', 'Family Law', 'Handles divorce, custody, and family-related legal matters', 'active'),
('dept-005', 'Real Estate', 'Handles property law, transactions, and real estate disputes', 'active'),
('dept-006', 'Intellectual Property', 'Handles patents, trademarks, copyrights, and IP disputes', 'active'),
('dept-007', 'Employment Law', 'Handles employment disputes, labor law, and workplace issues', 'active'),
('dept-008', 'Tax Law', 'Handles tax planning, disputes, and compliance matters', 'active'),
('dept-009', 'Bankruptcy', 'Handles bankruptcy filings and debt restructuring', 'active'),
('dept-010', 'General Practice', 'Handles general legal matters and consultations', 'active')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
status = VALUES(status);
