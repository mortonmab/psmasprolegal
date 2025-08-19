import apiService from './apiService';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'court_date' | 'meeting' | 'deadline' | 'client_meeting' | 'internal_meeting' | 'other';
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location?: string;
  is_all_day: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  created_by: string;
  case_id?: string;
  contract_id?: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id?: string;
  external_name?: string;
  external_email?: string;
  role: 'organizer' | 'attendee' | 'optional';
  response_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  reminder_sent: boolean;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
  user_full_name?: string;
  user_email?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_type: 'court_date' | 'meeting' | 'deadline' | 'client_meeting' | 'internal_meeting' | 'other';
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location?: string;
  is_all_day?: boolean;
  priority?: 'high' | 'medium' | 'low';
  case_id?: string;
  contract_id?: string;
  attendees: Array<{
    user_id?: string;
    external_name?: string;
    external_email?: string;
    role?: 'organizer' | 'attendee' | 'optional';
  }>;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_type?: 'court_date' | 'meeting' | 'deadline' | 'client_meeting' | 'internal_meeting' | 'other';
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  is_all_day?: boolean;
  priority?: 'high' | 'medium' | 'low';
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  case_id?: string;
  contract_id?: string;
}

export class CalendarService {
  /**
   * Get all events for the current user
   */
  static async getEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiService.get(`/calendar/events?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific event by ID
   */
  static async getEvent(eventId: string): Promise<{ event: CalendarEvent; attendees: EventAttendee[] }> {
    const response = await apiService.get(`/calendar/events/${eventId}`);
    return response.data;
  }

  /**
   * Create a new event
   */
  static async createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
    const response = await apiService.post('/calendar/events', eventData);
    return response.data;
  }

  /**
   * Update an event
   */
  static async updateEvent(eventId: string, updateData: UpdateEventData): Promise<CalendarEvent> {
    const response = await apiService.put(`/calendar/events/${eventId}`, updateData);
    return response.data;
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string): Promise<void> {
    await apiService.delete(`/calendar/events/${eventId}`);
  }

  /**
   * Update attendee response status
   */
  static async updateAttendeeResponse(
    eventId: string, 
    attendeeId: string, 
    responseStatus: 'accepted' | 'declined' | 'tentative'
  ): Promise<void> {
    await apiService.put(`/calendar/events/${eventId}/attendees/${attendeeId}/response`, {
      responseStatus
    });
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const response = await apiService.get(`/calendar/upcoming?days=${days}`);
    return response.data;
  }

  /**
   * Get events for a specific month
   */
  static async getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    
    return await this.getEvents(startDate, endDate);
  }

  /**
   * Get events for a specific date range
   */
  static async getEventsForDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return await this.getEvents(startDate, endDate);
  }

  /**
   * Format event time for display
   */
  static formatEventTime(startTime: string, endTime: string): string {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  /**
   * Get event type color
   */
  static getEventTypeColor(eventType: string): string {
    switch (eventType) {
      case 'court_date': return 'bg-red-100 text-red-800';
      case 'deadline': return 'bg-yellow-100 text-yellow-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'client_meeting': return 'bg-blue-100 text-blue-800';
      case 'internal_meeting': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get event type label
   */
  static getEventTypeLabel(eventType: string): string {
    return eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
