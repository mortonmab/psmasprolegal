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
}
