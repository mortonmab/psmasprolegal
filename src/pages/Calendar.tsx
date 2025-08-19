import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { CalendarService, CalendarEvent } from '../services/calendarService';
import { EventModal } from '../components/EventModal';
import { useAuth } from '../hooks/useAuth';

interface TimeEntry {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  category: 'Case Work' | 'Client Meeting' | 'Court Appearance' | 'Research' | 'Administrative' | 'Other';
  caseNumber?: string;
  billable: boolean;
  hours: number;
}

export function Calendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedEventForView, setSelectedEventForView] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Timesheet state
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [timeEntries] = useState<TimeEntry[]>([
    {
      id: 1,
      date: '2024-03-18',
      startTime: '09:00',
      endTime: '11:00',
      description: 'Case review and documentation',
      category: 'Case Work',
      caseNumber: 'CASE-2024-001',
      billable: true,
      hours: 2
    },
    {
      id: 2,
      date: '2024-03-18',
      startTime: '14:00',
      endTime: '16:00',
      description: 'Client consultation',
      category: 'Client Meeting',
      caseNumber: 'CASE-2024-002',
      billable: true,
      hours: 2
    }
  ]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Load events for the current month
  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const eventsData = await CalendarService.getEventsForMonth(year, month);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  // Calendar navigation
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleCreateEvent = () => {
    setSelectedEvent(undefined);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await CalendarService.deleteEvent(event.id);
        loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
      }
    }
  };

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEventForView(event);
    setShowEventDetails(true);
  };

  const handleEventSaved = () => {
    loadEvents();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage all your court dates, meetings, and deadlines.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateEvent}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add event
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading calendar events...</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Calendar Grid */}
          <div className="flex-1 bg-white shadow rounded-lg">
          {/* Calendar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={previousMonth}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px mt-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Days Grid */}
          <div className="h-[32rem] grid grid-cols-7 grid-rows-5 gap-px bg-gray-200">
            {daysInMonth.map((date) => {
              const dayEvents = getEventsForDate(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isCurrentMonth = isSameMonth(date, currentMonth);

              return (
                <div
                  key={date.toString()}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    min-h-[100px] bg-white p-2 hover:bg-gray-50 cursor-pointer
                    ${!isCurrentMonth && 'text-gray-400'}
                    ${isSelected && 'bg-blue-50'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isSameDay(date, new Date()) 
                        ? 'bg-blue-600 text-white h-6 w-6 rounded-full flex items-center justify-center'
                        : ''
                    }`}>
                      {format(date, 'd')}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`
                          text-xs truncate rounded px-1 py-0.5 cursor-pointer hover:opacity-80
                          ${CalendarService.getEventTypeColor(event.event_type)}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        <div className="w-80 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'No date selected'}
          </h3>
          {selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Events</span>
                <button 
                  onClick={handleCreateEvent}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Add event
                </button>
              </div>
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewEvent(event)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {event.created_by === user?.id && (
                            <>
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          {CalendarService.formatEventTime(event.start_time, event.end_time)}
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            CalendarService.getEventTypeColor(event.event_type)
                          }`}>
                            {CalendarService.getEventTypeLabel(event.event_type)}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            CalendarService.getPriorityColor(event.priority)
                          }`}>
                            {event.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No events scheduled</p>
              )}
            </div>
          )}
        </div>
      </div>
        )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEventForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedEventForView.title}</h3>
                {selectedEventForView.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedEventForView.description}</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  {CalendarService.formatEventTime(selectedEventForView.start_time, selectedEventForView.end_time)}
                </div>
                
                {selectedEventForView.location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {selectedEventForView.location}
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    CalendarService.getEventTypeColor(selectedEventForView.event_type)
                  }`}>
                    {CalendarService.getEventTypeLabel(selectedEventForView.event_type)}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    CalendarService.getPriorityColor(selectedEventForView.priority)
                  }`}>
                    {selectedEventForView.priority}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-end space-x-2">
                  {selectedEventForView.created_by === user?.id && (
                    <>
                      <button
                        onClick={() => {
                          setShowEventDetails(false);
                          handleEditEvent(selectedEventForView);
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowEventDetails(false);
                          handleDeleteEvent(selectedEventForView);
                        }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowEventDetails(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSave={handleEventSaved}
        event={selectedEvent}
        selectedDate={selectedDate || undefined}
      />

      {/* Visual separator */}
      <div className="border-t border-gray-200 my-8"></div>

      {/* Timesheet Section */}
      <div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Timesheet Header */}
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Timesheet</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track and manage your billable hours and activities
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                    className="p-2 text-gray-400 hover:text-gray-500"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-900">
                    Week of {format(selectedWeek, 'MMM d, yyyy')}
                  </span>
                  <button
                    onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                    className="p-2 text-gray-400 hover:text-gray-500"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Entry
                </button>
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Submit Timesheet
                </button>
              </div>
            </div>

            {/* Time Entries Table */}
            <div className="mt-4">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Case Number</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Hours</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Billable</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {timeEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                          {format(new Date(entry.date), 'MMM d, yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {entry.startTime} - {entry.endTime}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {entry.category}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {entry.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {entry.caseNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {entry.hours}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.billable ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button className="text-gray-400 hover:text-gray-500">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th scope="row" colSpan={5} className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Total Hours
                      </th>
                      <td className="whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-gray-900">
                        {timeEntries.reduce((sum, entry) => sum + entry.hours, 0)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}