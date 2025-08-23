import { apiService } from './apiService';

export interface ComplianceReminderRecipient {
  id: string;
  complianceRecordId: string;
  userId?: string;
  externalUserId?: string;
  email: string;
  name: string;
  role?: string;
  createdAt: string;
}

export interface ComplianceReminder {
  id: string;
  complianceRecordId: string;
  recipientId: string;
  reminderType: 'two_weeks' | 'one_week' | 'due_date' | 'overdue';
  scheduledDate: string;
  sentAt?: string;
  emailSent: boolean;
  confirmationToken?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceConfirmation {
  id: string;
  complianceRecordId: string;
  reminderId: string;
  confirmedBy: string;
  confirmedEmail: string;
  confirmationType: 'submitted' | 'renewed' | 'extended' | 'completed';
  notes?: string;
  confirmationDate: string;
}

export interface AddRecipientData {
  complianceRecordId: string;
  userId?: string;
  externalUserId?: string;
  email: string;
  name: string;
  role?: string;
}

export interface ConfirmComplianceData {
  confirmedBy: string;
  confirmedEmail: string;
  confirmationType: 'submitted' | 'renewed' | 'extended' | 'completed';
  notes?: string;
}

export class ComplianceReminderService {
  /**
   * Get recipients for a compliance record
   */
  static async getRecipients(complianceRecordId: string): Promise<ComplianceReminderRecipient[]> {
    const response = await apiService.get(`/compliance-records/${complianceRecordId}/recipients`);
    return response.data || [];
  }

  /**
   * Add a recipient to a compliance record
   */
  static async addRecipient(data: AddRecipientData): Promise<ComplianceReminderRecipient> {
    const response = await apiService.post(`/compliance-records/${data.complianceRecordId}/recipients`, data);
    return response.data;
  }

  /**
   * Remove a recipient from a compliance record
   */
  static async removeRecipient(recipientId: string): Promise<boolean> {
    const response = await apiService.delete(`/compliance-records/recipients/${recipientId}`);
    return response.success;
  }

  /**
   * Schedule reminders for a compliance record
   */
  static async scheduleReminders(complianceRecordId: string): Promise<boolean> {
    const response = await apiService.post(`/compliance-records/${complianceRecordId}/schedule-reminders`);
    return response.success;
  }

  /**
   * Confirm compliance submission/renewal
   */
  static async confirmCompliance(token: string, data: ConfirmComplianceData): Promise<boolean> {
    const response = await apiService.post(`/compliance-confirm/${token}`, data);
    return response.success;
  }

  /**
   * Get confirmation details by token
   */
  static async getConfirmationByToken(token: string): Promise<{
    reminder: ComplianceReminder;
    complianceRecord: any;
    recipient: ComplianceReminderRecipient;
  } | null> {
    try {
      const response = await apiService.get(`/compliance-confirm/${token}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Send reminder emails (manual trigger for testing)
   */
  static async sendReminderEmails(): Promise<boolean> {
    const response = await apiService.post('/compliance-reminders/send');
    return response.success;
  }
}
