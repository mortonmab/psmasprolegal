import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Mail } from 'lucide-react';
import { CalendarService, CreateEventData, UpdateEventData, CalendarEvent } from '../services/calendarService';
import { userService } from '../services/userService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: CalendarEvent;
  selectedDate?: Date;
}

interface Attendee {
  user_id?: string;
  external_name?: string;
  external_email?: string;
  role: 'organizer' | 'attendee' | 'optional';
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function EventModal({ isOpen, onClose, onSave, event, selectedDate }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'court_date' | 'meeting' | 'deadline' | 'client_meeting' | 'internal_meeting' | 'other'>('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [newAttendeeType, setNewAttendeeType] = useState<'user' | 'external'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (event) {
        // Edit mode
        setTitle(event.title);
        setDescription(event.description || '');
        setEventType(event.event_type);
        setStartDate(event.start_date);
        setStartTime(event.start_time);
        setEndDate(event.end_date);
        setEndTime(event.end_time);
        setLocation(event.location || '');
        setIsAllDay(event.is_all_day);
        setPriority(event.priority);
        // Load attendees
        loadEventAttendees();
      } else {
        // Create mode
        resetForm();
        if (selectedDate) {
          const dateStr = selectedDate.toISOString().split('T')[0];
          setStartDate(dateStr);
          setEndDate(dateStr);
        }
      }
    }
  }, [isOpen, event, selectedDate]);

  const loadUsers = async () => {
    try {
      const response = await userService.getAllUsers();
      setUsers(response);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadEventAttendees = async () => {
    if (!event) return;
    
    try {
      const response = await CalendarService.getEvent(event.id);
      const eventAttendees: Attendee[] = response.attendees.map(attendee => ({
        user_id: attendee.user_id,
        external_name: attendee.external_name,
        external_email: attendee.external_email,
        role: attendee.role
      }));
      setAttendees(eventAttendees);
    } catch (error) {
      console.error('Error loading attendees:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('meeting');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('10:00');
    setLocation('');
    setIsAllDay(false);
    setPriority('medium');
    setAttendees([]);
    setShowAddAttendee(false);
    setNewAttendeeType('user');
    setSelectedUserId('');
    setExternalName('');
    setExternalEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData: CreateEventData = {
        title,
        description,
        event_type: eventType,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        location,
        is_all_day: isAllDay,
        priority,
        attendees
      };

      if (event) {
        // Update existing event
        const updateData: UpdateEventData = {
          title,
          description,
          event_type: eventType,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          location,
          is_all_day: isAllDay,
          priority
        };
        await CalendarService.updateEvent(event.id, updateData);
      } else {
        // Create new event
        await CalendarService.createEvent(eventData);
        alert('Event created successfully! Email invitations have been sent to all attendees.');
      }

      onSave();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addAttendee = () => {
    if (newAttendeeType === 'user' && selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setAttendees([...attendees, {
          user_id: selectedUserId,
          role: 'attendee'
        }]);
        setSelectedUserId('');
      }
    } else if (newAttendeeType === 'external' && externalName && externalEmail) {
      setAttendees([...attendees, {
        external_name: externalName,
        external_email: externalEmail,
        role: 'attendee'
      }]);
      setExternalName('');
      setExternalEmail('');
    }
    setShowAddAttendee(false);
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const getAttendeeDisplayName = (attendee: Attendee) => {
    if (attendee.user_id) {
      const user = users.find(u => u.id === attendee.user_id);
      return user ? user.full_name : 'Unknown User';
    }
    return attendee.external_name || 'Unknown';
  };

  const getAttendeeEmail = (attendee: Attendee) => {
    if (attendee.user_id) {
      const user = users.find(u => u.id === attendee.user_id);
      return user ? user.email : '';
    }
    return attendee.external_email || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="meeting">Meeting</option>
                <option value="court_date">Court Date</option>
                <option value="deadline">Deadline</option>
                <option value="client_meeting">Client Meeting</option>
                <option value="internal_meeting">Internal Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event description"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allDay" className="ml-2 block text-sm text-gray-900">
              All day event
            </label>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Attendees */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Attendees
              </label>
              <button
                type="button"
                onClick={() => setShowAddAttendee(true)}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Attendee
              </button>
            </div>

            {attendees.length > 0 && (
              <div className="space-y-2">
                {attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getAttendeeDisplayName(attendee)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getAttendeeEmail(attendee)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttendee(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddAttendee && (
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attendee Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="user"
                        checked={newAttendeeType === 'user'}
                        onChange={(e) => setNewAttendeeType(e.target.value as 'user' | 'external')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">System User</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="external"
                        checked={newAttendeeType === 'external'}
                        onChange={(e) => setNewAttendeeType(e.target.value as 'user' | 'external')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">External Party</span>
                    </label>
                  </div>
                </div>

                {newAttendeeType === 'user' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select User
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAttendee(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addAttendee}
                    disabled={
                      (newAttendeeType === 'user' && !selectedUserId) ||
                      (newAttendeeType === 'external' && (!externalName || !externalEmail))
                    }
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
