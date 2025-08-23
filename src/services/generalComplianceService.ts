import { apiService } from './apiService';

export interface GeneralComplianceRecord {
  id: string;
  name: string;
  description?: string;
  complianceType: 'tax_return' | 'license_renewal' | 'certification' | 'registration' | 'permit' | 'insurance' | 'audit' | 'report' | 'other';
  dueDate: string;
  dueDay?: number; // Day of month for recurring items (1-31)
  expiryDate?: string;
  renewalDate?: string;
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually' | 'biennially' | 'custom';
  status: 'active' | 'pending' | 'overdue' | 'completed' | 'expired';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  departmentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
  departmentName?: string;
  createdByName?: string;
}

export interface CreateComplianceRecordData {
  name: string;
  description?: string;
  complianceType: string;
  dueDate: string;
  dueDay?: number;
  expiryDate?: string;
  renewalDate?: string;
  frequency: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  departmentId?: string;
}

export interface UpdateComplianceRecordData {
  name?: string;
  description?: string;
  complianceType?: string;
  dueDate?: string;
  dueDay?: number;
  expiryDate?: string;
  renewalDate?: string;
  frequency?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  departmentId?: string;
}

export interface ComplianceFilters {
  status?: string;
  priority?: string;
  complianceType?: string;
  assignedTo?: string;
  departmentId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export class GeneralComplianceService {
  /**
   * Create a new compliance record
   */
  static async createComplianceRecord(data: CreateComplianceRecordData): Promise<GeneralComplianceRecord> {
    const response = await apiService.post('/test/general-compliance', data);
    // The backend returns { success: true, data: record }
    return response.data;
  }

  /**
   * Get all compliance records with optional filtering
   */
  static async getComplianceRecords(filters?: ComplianceFilters): Promise<GeneralComplianceRecord[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
    }
    
    const response = await apiService.get(`/test/general-compliance?${params.toString()}`);
    // The backend returns { success: true, data: records }
    return response.data || [];
  }

  /**
   * Get a single compliance record by ID
   */
  static async getComplianceRecordById(id: string): Promise<GeneralComplianceRecord> {
    const response = await apiService.get(`/general-compliance/${id}`);
    // The backend returns { success: true, data: record }
    return response.data;
  }

  /**
   * Update a compliance record
   */
  static async updateComplianceRecord(id: string, data: UpdateComplianceRecordData): Promise<GeneralComplianceRecord> {
    const response = await apiService.put(`/general-compliance/${id}`, data);
    // The backend returns { success: true, data: record }
    return response.data;
  }

  /**
   * Delete a compliance record
   */
  static async deleteComplianceRecord(id: string): Promise<void> {
    await apiService.delete(`/general-compliance/${id}`);
  }

  /**
   * Get overdue compliance records
   */
  static async getOverdueRecords(): Promise<GeneralComplianceRecord[]> {
    const response = await apiService.get('/general-compliance/overdue');
    // The backend returns { success: true, data: records }
    return response.data || [];
  }

  /**
   * Get upcoming due records
   */
  static async getUpcomingDueRecords(days: number = 30): Promise<GeneralComplianceRecord[]> {
    const response = await apiService.get(`/general-compliance/upcoming?days=${days}`);
    // The backend returns { success: true, data: records }
    return response.data || [];
  }

  /**
   * Get compliance type options
   */
  static getComplianceTypeOptions() {
    return [
      { value: 'tax_return', label: 'Tax Return' },
      { value: 'license_renewal', label: 'License Renewal' },
      { value: 'certification', label: 'Certification' },
      { value: 'registration', label: 'Registration' },
      { value: 'permit', label: 'Permit' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'audit', label: 'Audit' },
      { value: 'report', label: 'Report' },
      { value: 'other', label: 'Other' }
    ];
  }

  /**
   * Get frequency options
   */
  static getFrequencyOptions() {
    return [
      { value: 'once', label: 'Once' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' },
      { value: 'biennially', label: 'Biennially' },
      { value: 'custom', label: 'Custom' }
    ];
  }

  /**
   * Get status options
   */
  static getStatusOptions() {
    return [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'completed', label: 'Completed' },
      { value: 'expired', label: 'Expired' }
    ];
  }

  /**
   * Get priority options
   */
  static getPriorityOptions() {
    return [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ];
  }

  /**
   * Get status color
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get compliance type color
   */
  static getComplianceTypeColor(type: string): string {
    switch (type) {
      case 'tax_return':
        return 'bg-purple-100 text-purple-800';
      case 'license_renewal':
        return 'bg-blue-100 text-blue-800';
      case 'certification':
        return 'bg-green-100 text-green-800';
      case 'registration':
        return 'bg-indigo-100 text-indigo-800';
      case 'permit':
        return 'bg-orange-100 text-orange-800';
      case 'insurance':
        return 'bg-pink-100 text-pink-800';
      case 'audit':
        return 'bg-red-100 text-red-800';
      case 'report':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Check if a record is overdue
   */
  static isOverdue(record: GeneralComplianceRecord): boolean {
    // For recurring items, check if the next due date has passed
    if (record.frequency !== 'once') {
      const nextDueDate = this.calculateNextDueDate(record.frequency, record.dueDay, record.dueDate);
      const today = new Date();
      return new Date(nextDueDate) < today && ['active', 'pending'].includes(record.status);
    }
    
    // For one-time items, use the original due date
    const dueDate = new Date(record.dueDate);
    const today = new Date();
    return dueDate < today && ['active', 'pending'].includes(record.status);
  }

  /**
   * Check if a record is due soon (within 7 days)
   */
  static isDueSoon(record: GeneralComplianceRecord): boolean {
    // For recurring items, check the next due date
    if (record.frequency !== 'once') {
      const nextDueDate = this.calculateNextDueDate(record.frequency, record.dueDay, record.dueDate);
      const today = new Date();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return new Date(nextDueDate) <= sevenDaysFromNow && new Date(nextDueDate) >= today && ['active', 'pending'].includes(record.status);
    }
    
    // For one-time items, use the original due date
    const dueDate = new Date(record.dueDate);
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate <= sevenDaysFromNow && dueDate >= today && ['active', 'pending'].includes(record.status);
  }

  /**
   * Format due date for display
   */
  static formatDueDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get days until due
   */
  static getDaysUntilDue(dateString: string): number {
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get days until due for a compliance record (handles recurring items)
   */
  static getDaysUntilDueForRecord(record: GeneralComplianceRecord): number {
    // For recurring items, calculate the next due date
    if (record.frequency !== 'once') {
      const nextDueDate = this.calculateNextDueDate(record.frequency, record.dueDay, record.dueDate);
      return this.getDaysUntilDue(nextDueDate);
    }
    
    // For one-time items, use the original due date
    return this.getDaysUntilDue(record.dueDate);
  }

  /**
   * Calculate next due date based on frequency and due day
   */
  static calculateNextDueDate(frequency: string, dueDay?: number, currentDueDate?: string): string {
    const today = new Date();
    let nextDueDate = new Date();

    if (frequency === 'once') {
      return currentDueDate || today.toISOString().split('T')[0];
    }

    if (frequency === 'monthly' && dueDay) {
      // Set to the due day of current month
      nextDueDate.setDate(dueDay);
      
      // If the due day has passed this month, move to next month
      if (nextDueDate < today) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setDate(dueDay);
      }
    } else if (frequency === 'quarterly') {
      // Calculate next quarter
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const nextQuarter = (currentQuarter + 1) % 4;
      const nextQuarterMonth = nextQuarter * 3;
      
      nextDueDate.setMonth(nextQuarterMonth);
      nextDueDate.setDate(dueDay || 1);
      
      // If we're still in the current quarter, move to next quarter
      if (nextDueDate < today) {
        nextDueDate.setMonth(nextQuarterMonth + 3);
        nextDueDate.setDate(dueDay || 1);
      }
    } else if (frequency === 'annually') {
      // Set to same month and day next year
      if (currentDueDate) {
        const currentDue = new Date(currentDueDate);
        nextDueDate = new Date(today.getFullYear(), currentDue.getMonth(), currentDue.getDate());
        
        // If the date has passed this year, move to next year
        if (nextDueDate < today) {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }
      } else {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        nextDueDate.setDate(dueDay || 1);
      }
    } else if (frequency === 'biennially') {
      // Set to same month and day two years from now
      if (currentDueDate) {
        const currentDue = new Date(currentDueDate);
        nextDueDate = new Date(today.getFullYear(), currentDue.getMonth(), currentDue.getDate());
        
        // If the date has passed this year, move to next biennium
        if (nextDueDate < today) {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 2);
        }
      } else {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 2);
        nextDueDate.setDate(dueDay || 1);
      }
    }

    return nextDueDate.toISOString().split('T')[0];
  }

  /**
   * Get display text for due date based on frequency and due day
   */
  static getDueDateDisplayText(record: GeneralComplianceRecord): string {
    if (record.frequency === 'once') {
      return `Due: ${this.formatDueDate(record.dueDate)}`;
    }

    if (record.frequency === 'monthly' && record.dueDay) {
      return `Due: ${record.dueDay}${this.getDaySuffix(record.dueDay)} of each month`;
    }

    if (record.frequency === 'quarterly' && record.dueDay) {
      return `Due: ${record.dueDay}${this.getDaySuffix(record.dueDay)} of each quarter`;
    }

    if (record.frequency === 'annually') {
      return `Due: ${this.formatDueDate(record.dueDate)} annually`;
    }

    if (record.frequency === 'biennially') {
      return `Due: ${this.formatDueDate(record.dueDate)} biennially`;
    }

    return `Due: ${this.formatDueDate(record.dueDate)}`;
  }

  /**
   * Get day suffix (1st, 2nd, 3rd, etc.)
   */
  private static getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
}
