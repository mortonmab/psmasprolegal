import { pool, generateUUID } from './database';
import { EmailService } from './emailService';

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
   * Create a new calendar event
   */
  static async createEvent(eventData: CreateEventData, createdBy: string): Promise<CalendarEvent> {
    const connection = await pool.getConnection();
    
    try {
      console.log('Creating event:', { title: eventData.title, createdBy });
      await connection.beginTransaction();
      
      const eventId = generateUUID();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Insert the event
      await connection.execute(
        `INSERT INTO calendar_events (
          id, title, description, event_type, start_date, start_time, 
          end_date, end_time, location, is_all_day, priority, created_by, 
          case_id, contract_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          eventData.title,
          eventData.description || null,
          eventData.event_type,
          eventData.start_date,
          eventData.start_time,
          eventData.end_date,
          eventData.end_time,
          eventData.location || null,
          eventData.is_all_day || false,
          eventData.priority || 'medium',
          createdBy,
          eventData.case_id || null,
          eventData.contract_id || null,
          now,
          now
        ]
      );
      
      // Add attendees
      for (const attendee of eventData.attendees) {
        const attendeeId = generateUUID();
        const attendeeNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await connection.execute(
          `INSERT INTO event_attendees (
            id, event_id, user_id, external_name, external_email, role, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attendeeId,
            eventId,
            attendee.user_id || null,
            attendee.external_name || null,
            attendee.external_email || null,
            attendee.role || 'attendee',
            attendeeNow,
            attendeeNow
          ]
        );
      }
      
      await connection.commit();
      
      // Send email notifications to attendees asynchronously (don't block the response)
      this.sendEventNotifications(eventId).catch(error => {
        console.error('Error sending event notifications:', error);
      });
      
      const createdEvent = await this.getEventById(eventId);
      if (!createdEvent) {
        throw new Error('Failed to create event');
      }
      console.log('Event created successfully:', createdEvent.id);
      return createdEvent;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get all events for a user (events they created or are invited to)
   */
  static async getUserEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    let query = `
      SELECT DISTINCT ce.* 
      FROM calendar_events ce
      LEFT JOIN event_attendees ea ON ce.id = ea.event_id
      WHERE ce.created_by = ? OR ea.user_id = ?
    `;
    
    const params: (string | undefined)[] = [userId, userId];
    
    if (startDate && endDate) {
      query += ` AND (
        (ce.start_date BETWEEN ? AND ?) OR 
        (ce.end_date BETWEEN ? AND ?) OR 
        (ce.start_date <= ? AND ce.end_date >= ?)
      )`;
      params.push(startDate, endDate, startDate, endDate, startDate, endDate);
    }
    
    query += ` ORDER BY ce.start_date ASC, ce.start_time ASC`;
    
    const [rows] = await pool.execute(query, params);
    return rows as CalendarEvent[];
  }
  
  /**
   * Get a specific event by ID
   */
  static async getEventById(eventId: string): Promise<CalendarEvent | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM calendar_events WHERE id = ?',
      [eventId]
    );
    
    const events = rows as CalendarEvent[];
    return events.length > 0 ? events[0] : null;
  }
  
  /**
   * Get attendees for an event
   */
  static async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    const [rows] = await pool.execute(
      `SELECT ea.*, u.full_name as user_full_name, u.email as user_email
       FROM event_attendees ea
       LEFT JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = ?
       ORDER BY ea.role DESC, ea.created_at ASC`,
      [eventId]
    );
    
    return rows as EventAttendee[];
  }
  
  /**
   * Update an event
   */
  static async updateEvent(eventId: string, updateData: UpdateEventData, userId: string): Promise<CalendarEvent> {
    // Check if user has permission to update this event
    const event = await this.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (event.created_by !== userId) {
      throw new Error('You can only update events you created');
    }
    
    const updateFields: string[] = [];
    const updateValues: (string | boolean | undefined)[] = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    updateValues.push(eventId);
    
    await pool.execute(
      `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    return await this.getEventById(eventId) as CalendarEvent;
  }
  
  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    // Check if user has permission to delete this event
    const event = await this.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (event.created_by !== userId) {
      throw new Error('You can only delete events you created');
    }
    
    await pool.execute('DELETE FROM calendar_events WHERE id = ?', [eventId]);
  }
  
  /**
   * Update attendee response status
   */
  static async updateAttendeeResponse(
    eventId: string, 
    attendeeId: string, 
    responseStatus: 'accepted' | 'declined' | 'tentative',
    userId: string
  ): Promise<void> {
    // Verify the attendee is the current user
    const [attendeeRows] = await pool.execute(
      'SELECT * FROM event_attendees WHERE id = ? AND user_id = ?',
      [attendeeId, userId]
    );
    
    const attendees = attendeeRows as EventAttendee[];
    if (attendees.length === 0) {
      throw new Error('Attendee not found or unauthorized');
    }
    
    await pool.execute(
      'UPDATE event_attendees SET response_status = ?, updated_at = ? WHERE id = ?',
      [responseStatus, new Date().toISOString().slice(0, 19).replace('T', ' '), attendeeId]
    );
  }
  
  /**
   * Send email notifications for event
   */
  static async sendEventNotifications(eventId: string): Promise<void> {
    try {
      console.log('Starting to send event notifications for event:', eventId);
      const event = await this.getEventById(eventId);
      const attendees = await this.getEventAttendees(eventId);
      
      if (!event) return;
      
      // Get creator details
      const [creatorRows] = await pool.execute(
        'SELECT full_name, email FROM users WHERE id = ?',
        [event.created_by]
      );
      const creators = creatorRows as { full_name: string; email: string }[];
      const creator = creators[0];
      
      // Send notifications to all attendees
      for (const attendee of attendees) {
        if (attendee.user_id) {
          // System user
          const [userRows] = await pool.execute(
            'SELECT full_name, email FROM users WHERE id = ?',
            [attendee.user_id]
          );
          const users = userRows as { full_name: string; email: string }[];
          const user = users[0];
          
          if (user) {
            await EmailService.sendEventInvitation({
              eventId: event.id,
              eventTitle: event.title,
              eventDescription: event.description || '',
              eventType: event.event_type,
              startDate: event.start_date,
              startTime: event.start_time,
              endDate: event.end_date,
              endTime: event.end_time,
              location: event.location || '',
              organizerName: creator.full_name,
              organizerEmail: creator.email,
              attendeeName: user.full_name,
              attendeeEmail: user.email,
              role: attendee.role
            });
          }
        } else if (attendee.external_email) {
          // External attendee
          await EmailService.sendEventInvitation({
            eventId: event.id,
            eventTitle: event.title,
            eventDescription: event.description || '',
            eventType: event.event_type,
            startDate: event.start_date,
            startTime: event.start_time,
            endDate: event.end_date,
            endTime: event.end_time,
            location: event.location || '',
            organizerName: creator.full_name,
            organizerEmail: creator.email,
            attendeeName: attendee.external_name || 'Guest',
            attendeeEmail: attendee.external_email,
            role: attendee.role
          });
        }
      }
      
      // Mark reminders as sent
      await pool.execute(
        'UPDATE calendar_events SET reminder_sent = TRUE, reminder_sent_at = ? WHERE id = ?',
        [new Date().toISOString().slice(0, 19).replace('T', ' '), eventId]
      );
      
      await pool.execute(
        'UPDATE event_attendees SET reminder_sent = TRUE, reminder_sent_at = ? WHERE event_id = ?',
        [new Date().toISOString().slice(0, 19).replace('T', ' '), eventId]
      );
      
    } catch (error) {
      console.error('Error sending event notifications:', error);
    }
  }
  
  /**
   * Get events for a specific date range
   */
  static async getEventsByDateRange(startDate: string, endDate: string, userId: string): Promise<CalendarEvent[]> {
    return await this.getUserEvents(userId, startDate, endDate);
  }
  
  /**
   * Get upcoming events for a user
   */
  static async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarEvent[]> {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return await this.getUserEvents(userId, startDate, endDate);
  }
}
