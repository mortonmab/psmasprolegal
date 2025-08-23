import { apiService } from './apiService';
import { ComplianceRun, ComplianceQuestion, ComplianceRecipient, ComplianceResponse } from '../lib/types';

export interface CreateComplianceRunData {
  title: string;
  description: string;
  frequency: string;
  startDate: string;
  dueDate: string;
  departmentIds: string[];
  questions: Array<{
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options?: string[];
    maxScore?: number;
  }>;
}

export interface ComplianceRunDetails {
  run: ComplianceRun;
  questions: ComplianceQuestion[];
  recipients: ComplianceRecipient[];
  statistics: {
    totalRecipients: number;
    completedSurveys: number;
    pendingSurveys: number;
    completionRate: number;
  };
}

export interface SurveyData {
  run: ComplianceRun;
  questions: ComplianceQuestion[];
  recipient: ComplianceRecipient;
}

export interface SurveyResponse {
  questionId: string;
  answer?: string;
  score?: number;
  comment?: string;
}

export class ComplianceService {
  /**
   * Create a new compliance run
   */
  static async createComplianceRun(data: CreateComplianceRunData): Promise<ComplianceRun> {
    const response = await apiService.post('/compliance/runs', data);
    return response.data;
  }

  /**
   * Get all compliance runs
   */
  static async getComplianceRuns(): Promise<ComplianceRun[]> {
    const response = await apiService.get('/compliance/runs');
    return response.data;
  }

  /**
   * Get compliance run details
   */
  static async getComplianceRunDetails(runId: string): Promise<ComplianceRunDetails> {
    const response = await apiService.get(`/compliance/runs/${runId}`);
    return response.data;
  }

  /**
   * Activate a compliance run (send notifications)
   */
  static async activateComplianceRun(runId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post(`/compliance/runs/${runId}/activate`);
    return response;
  }

  /**
   * Get compliance survey by token (public endpoint)
   */
  static async getComplianceSurvey(token: string): Promise<SurveyData> {
    const response = await apiService.get(`/compliance/survey/${token}`, { 
      skipAuth: true 
    });
    return response.data;
  }

  /**
   * Submit compliance survey responses (public endpoint)
   */
  static async submitComplianceSurvey(token: string, responses: SurveyResponse[]): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post(`/compliance/survey/${token}/submit`, { 
      responses 
    }, { 
      skipAuth: true 
    });
    return response;
  }

  /**
   * Get survey responses for a compliance run
   */
  static async getSurveyResponses(runId: string): Promise<any> {
    const response = await apiService.get(`/compliance/runs/${runId}/responses`);
    return response.data;
  }

  /**
   * Generate survey report
   */
  static async generateSurveyReport(runId: string): Promise<any> {
    const response = await apiService.get(`/compliance/runs/${runId}/report`);
    return response.data;
  }

  /**
   * Share survey report via email
   */
  static async shareSurveyReport(runId: string, email: string, message?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post(`/compliance/runs/${runId}/share-report`, {
      email,
      message
    });
    return response;
  }

  /**
   * Download survey report as JSON
   */
  static async downloadSurveyReport(runId: string): Promise<void> {
    try {
      const report = await this.generateSurveyReport(runId);
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-survey-report-${runId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }
}
