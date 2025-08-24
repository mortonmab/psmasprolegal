import apiService from './apiService';

export interface TimesheetEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  description?: string;
  category: 'Case Work' | 'Client Meeting' | 'Court Appearance' | 'Research' | 'Administrative' | 'Other';
  case_id?: string | null;
  contract_id?: string | null;
  hours: number;
  created_at: string;
}

export interface CreateTimesheetEntry {
  entry_date: string;
  start_time: string;
  end_time: string;
  description?: string;
  category: TimesheetEntry['category'];
  case_id?: string | null;
  contract_id?: string | null;
  hours: number;
}

export class TimesheetService {
  static async getEntries(startDate?: string, endDate?: string): Promise<TimesheetEntry[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await apiService.get(`/timesheet?${params.toString()}`);
    return response;
  }

  static async createEntry(data: CreateTimesheetEntry): Promise<TimesheetEntry> {
    const response = await apiService.post('/timesheet', data);
    return response;
  }
}


