// Core data types for the ProLegal application

export type User = {
  id: string;
  email: string;
  password_hash?: string; // Not returned in API responses
  full_name: string;
  role: 'admin' | 'attorney' | 'paralegal' | 'staff';
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  department?: string;
  avatar_url?: string;
  email_verified?: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  description?: string;
  head_user_id?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type UserDepartment = {
  id: string;
  user_id: string;
  department_id: string;
  position?: string;
  is_primary: boolean;
  assigned_at: string;
};

export type Case = {
  id: string;
  case_number: string;
  case_name: string;
  description?: string;
  case_type: 'civil' | 'criminal' | 'family' | 'corporate' | 'employment' | 'real_estate' | 'intellectual_property' | 'tax' | 'bankruptcy' | 'other';
  status: 'open' | 'pending' | 'closed' | 'archived' | 'on_hold';
  priority: 'high' | 'medium' | 'low' | 'urgent';
  filing_date?: string;
  court_name?: string;
  court_case_number?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  assigned_members?: string;
  department_id?: string;
  client_name?: string;
  judge_name?: string;
  opposing_counsel?: string;
  estimated_value?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type NewCase = Omit<Case, 'id' | 'created_at' | 'updated_at'>;

export type CaseAssignment = {
  id: string;
  case_id: string;
  user_id: string;
  role: 'lead_attorney' | 'associate_attorney' | 'paralegal' | 'assistant';
  assigned_at: string;
  assigned_by: string;
};

export type CaseUpdate = {
  id: string;
  case_id: string;
  user_id: string;
  update_type: 'status_change' | 'assignment' | 'document_added' | 'note' | 'court_date' | 'other';
  title: string;
  content?: string;
  created_at: string;
  // Additional fields from JOIN with users table
  full_name?: string;
};

export type Vendor = {
  id: string;
  name: string;
  company_type: 'corporation' | 'partnership' | 'individual' | 'government' | 'other';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  vat_number?: string;
  tin_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  created_at: string;
  updated_at: string;
};

export type Contract = {
  id: string;
  contract_number: string;
  title: string;
  description?: string;
  vendor_id?: string;
  vendor_ids?: string[];
  contract_type_id?: string;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
  start_date?: string;
  end_date?: string;
  value?: string;
  currency?: string;
  payment_terms?: string;
  department_id?: string;
  created_at: string;
  updated_at: string;
};

export type ContractAssignment = {
  id: string;
  contract_id: string;
  user_id: string;
  role: 'manager' | 'reviewer' | 'approver' | 'monitor';
  assigned_at: string;
  assigned_by: string;
};

export type Document = {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  file_url?: string;
  mime_type?: string;
  document_type: 'contract' | 'evidence' | 'correspondence' | 'court_filing' | 'research' | 'other';
  category: 'cases' | 'contracts' | 'title_deeds' | 'policies' | 'frameworks' | 'correspondences' | 'board_minutes' | 'management_minutes' | 'sops' | 'governance' | 'other';
  status: 'draft' | 'final' | 'archived' | 'deleted';
  uploaded_by: string;
  case_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
  // Additional field from JOIN with users table
  uploaded_by_name?: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  change_notes?: string;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  task_type: 'case_related' | 'administrative' | 'client_related' | 'court_related' | 'research' | 'other';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_to?: string;
  assigned_by: string;
  case_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
};

export type ScrapedData = {
  id: string;
  title: string;
  content?: string;
  source_type: 'case_law' | 'legislation' | 'regulation' | 'gazette' | 'news' | 'other';
  source_url: string;
  source_name?: string;
  date_published?: string;
  reference_number?: string;
  jurisdiction?: string;
  keywords?: string;
  scraped_at: string;
};

export type ScrapingSource = {
  id: string;
  name: string;
  url: string;
  source_type: 'case_law' | 'legislation' | 'regulation' | 'gazette' | 'news' | 'other';
  is_active: boolean;
  selectors?: any; // JSON object for CSS selectors
  last_scraped?: string;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: any; // JSON object
  new_values?: any; // JSON object
  ip_address?: string;
  user_agent?: string;
  created_at: string;
};

export type ComplianceSurvey = {
  id: string;
  title: string;
  description?: string;
  department_id?: string;
  due_date?: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ComplianceRun = {
  id: string;
  title: string;
  description: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually';
  startDate: string;
  dueDate: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  created_by_name?: string;
  total_recipients?: number;
  completed_surveys?: number;
};

export type ComplianceQuestion = {
  id: string;
  complianceRunId: string;
  questionText: string;
  questionType: 'yesno' | 'score' | 'multiple' | 'text';
  isRequired: boolean;
  options?: string[];
  maxScore?: number;
  orderIndex: number;
  createdAt: string;
};

export type ComplianceRecipient = {
  id: string;
  complianceRunId: string;
  userId: string;
  departmentId: string;
  emailSent: boolean;
  emailSentAt?: string;
  surveyCompleted: boolean;
  surveyCompletedAt?: string;
  surveyLinkToken: string;
  createdAt: string;
  updatedAt: string;
  user_name?: string;
  email?: string;
  department_name?: string;
};

export type ComplianceResponse = {
  id: string;
  complianceRunId: string;
  userId: string;
  questionId: string;
  answer?: string;
  score?: number;
  comment?: string;
  createdAt: string;
};

// API Response types
export type AuthResponse = {
  user: User;
  token: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Legacy types for backward compatibility
