import apiService from './apiService';

export interface ReportFilter {
  id: string;
  name: string;
  type: 'select' | 'date' | 'text' | 'number';
  options?: string[];
  value: any;
}

export interface ReportData {
  id: string;
  [key: string]: any;
}

export interface ReportResponse {
  data: ReportData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CaseReportData {
  id: string;
  case_number: string;
  case_name: string;
  status: string;
  case_type: string;
  priority: string;
  filing_date: string;
  court_name: string;
  client_name: string;
  judge_name: string;
  department_name: string;
  assigned_members: string;
  created_at: string;
  updated_at: string;
  progress?: number;
}

export interface FinancialReportData {
  id: string;
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  cases_billed: number;
  outstanding_amount: number;
  contract_value: number;
  vendor_name: string;
  contract_type: string;
  status: string;
}

export interface UserActivityReportData {
  id: string;
  user_name: string;
  action: string;
  timestamp: string;
  details: string;
  duration: number;
  table_name: string;
  record_id: string;
  ip_address: string;
}

export interface PerformanceReportData {
  id: string;
  metric: string;
  value: number;
  target: number;
  percentage: number;
  period: string;
  department_name: string;
  user_name: string;
}

export interface ComplianceReportData {
  id: string;
  requirement: string;
  status: string;
  due_date: string;
  category: string;
  assigned_to: string;
  last_reviewed: string;
  department_name: string;
  priority: string;
}

export interface ContractReportData {
  id: string;
  contract_number: string;
  title: string;
  description: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  value: number;
  currency: string;
  payment_terms: string;
  vendor_name: string;
  vendor_type: string;
  vendor_contact: string;
  vendor_email: string;
  vendor_phone: string;
  created_at: string;
  updated_at: string;
  contract_status: string;
}

export const reportsService = {
  // Case Summary Report
  async getCaseSummaryReport(filters?: {
    status?: string;
    department?: string;
    assigned_to?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/cases${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // Financial Summary Report
  async getFinancialSummaryReport(filters?: {
    period?: string;
    type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/financial${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // User Activity Report
  async getUserActivityReport(filters?: {
    user?: string;
    action?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/activity${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // Performance Metrics Report
  async getPerformanceMetricsReport(filters?: {
    metric?: string;
    timeframe?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/performance${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // Compliance Report
  async getComplianceReport(filters?: {
    status?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/compliance${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // Contracts Report
  async getContractsReport(filters?: {
    status?: string;
    type?: string;
    vendor?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const endpoint = `/reports/contracts${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get<ReportResponse>(endpoint);
  },

  // Get filter options for reports
  async getFilterOptions(reportType: string): Promise<{
    departments?: string[];
    users?: string[];
    statuses?: string[];
    types?: string[];
    categories?: string[];
  }> {
    return await apiService.get(`/reports/filter-options/${reportType}`);
  },

  // Export report data
  async exportReport(
    reportType: string, 
    format: 'csv' | 'pdf', 
    filters?: Record<string, any>
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await apiService.get(`/reports/export/${reportType}?${params.toString()}`, {
      responseType: 'blob'
    });
    return response;
  }
};
