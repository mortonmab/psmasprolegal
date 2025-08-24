import React from 'react';
import { 
  Calendar as CalendarIcon,
  CheckSquare,
  Plus,
  TrendingUp,
  Briefcase,
  File
} from 'lucide-react';
import { format, isAfter, isBefore, addDays as addDaysToDate } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useCases } from '../hooks/useCases';
import { useTasks } from '../hooks/useTasks';
import { useContracts } from '../hooks/useContracts';
import { useVendors } from '../hooks/useVendors';
import { useUsers } from '../hooks/useUsers';
import { CalendarService, CalendarEvent } from '../services/calendarService';
import { ContractDetailsModal } from '../components/ContractDetailsModal';


export function Dashboard() {
  const { cases, loading: casesLoading, error: casesError } = useCases();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { contracts, loading: contractsLoading, error: contractsError } = useContracts();
  const { vendors, loading: vendorsLoading, error: vendorsError } = useVendors();
  const { users, loading: usersLoading, error: usersError } = useUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  
  // Contract modal state
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Fetch upcoming calendar events
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      setCalendarEventsLoading(true);
      try {
        const events = await CalendarService.getUpcomingEvents();
        setUpcomingCalendarEvents(events);
      } catch (error) {
        console.error('Error loading upcoming calendar events:', error);
        setUpcomingCalendarEvents([]);
      } finally {
        setCalendarEventsLoading(false);
      }
    };

    loadUpcomingEvents();
  }, []);

  // Calculate real statistics from database data
  const quickStats = useMemo(() => [
    {
      name: 'Active Cases',
      total: cases.filter(c => c.status === 'open' || c.status === 'pending').length,
      icon: Briefcase,
      iconBackground: 'bg-blue-100',
      iconColor: 'text-blue-600',
      metrics: {
        ytd: { value: cases.filter(c => c.status === 'open' || c.status === 'pending').length, trend: 'up' },
        mtd: { value: cases.filter(c => c.status === 'open' || c.status === 'pending').length, trend: 'up' }
      }
    },
    {
      name: 'Active Contracts',
      total: contracts.filter(c => c.status === 'active').length,
      icon: File,
      iconBackground: 'bg-green-100',
      iconColor: 'text-green-600',
      metrics: {
        ytd: { value: contracts.filter(c => c.status === 'active').length, trend: 'up' },
        mtd: { value: contracts.filter(c => c.status === 'active').length, trend: 'up' }
      }
    },
    {
      name: 'Pending Tasks',
      total: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      icon: CheckSquare,
      iconBackground: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      metrics: {
        current: `${tasks.filter(t => t.priority === 'high' && (t.status === 'pending' || t.status === 'in_progress')).length} high priority`
      }
    },
    {
      name: 'Total Vendors',
      total: vendors.filter(v => v.status === 'active').length,
      icon: CalendarIcon,
      iconBackground: 'bg-purple-100',
      iconColor: 'text-purple-600',
      metrics: {
        current: `${vendors.filter(v => v.status === 'active').length} active`
      }
    }
  ], [cases, contracts, tasks, vendors]);

  // Get recent tasks (last 5)
  const recentTasks = useMemo(() => {
    return tasks
      .filter(task => task.status === 'pending' || task.status === 'in_progress')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dueDate: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : 'No due date',
        status: task.status === 'in_progress' ? 'in-progress' : 'todo'
      }));
  }, [tasks]);

  // Get upcoming events (tasks due soon)
  const upcomingTaskEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addDaysToDate(now, 30);
    
    return tasks
      .filter(task => 
        task.due_date && 
        isAfter(new Date(task.due_date), now) && 
        isBefore(new Date(task.due_date), thirtyDaysFromNow)
      )
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 3)
      .map(task => ({
        id: task.id,
        title: task.title,
        time: task.due_date ? format(new Date(task.due_date), 'HH:mm') : 'TBD',
        date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : 'TBD',
        type: task.task_type === 'court_related' ? 'court' : 
              task.task_type === 'client_related' ? 'meeting' : 'internal'
      }));
  }, [tasks]);

  // Get expiring contracts (contracts ending soon)
  const expiringContracts = useMemo(() => {
    const now = new Date();
    const ninetyDaysFromNow = addDaysToDate(now, 90);
    
    return contracts
      .filter(contract => 
        contract.end_date && 
        isAfter(new Date(contract.end_date), now) && 
        isBefore(new Date(contract.end_date), ninetyDaysFromNow)
      )
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
      .slice(0, 3)
      .map(contract => ({
        id: contract.id,
        title: contract.title,
        expiryDate: contract.end_date ? format(new Date(contract.end_date), 'yyyy-MM-dd') : 'TBD',
        status: contract.end_date && isBefore(new Date(contract.end_date), addDaysToDate(now, 30)) ? 'warning' : 'notice'
      }));
  }, [contracts]);

  // Filter and paginate cases
  const filteredCases = useMemo(() => {
    return cases.filter(caseItem => 
      Object.values(caseItem).some(value => 
        value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [cases, searchQuery]);

  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredCases.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCases, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredCases.length / rowsPerPage);

  // Handle contract click
  const handleContractClick = (contractId: string) => {
    setSelectedContractId(contractId);
    setShowContractModal(true);
  };

  // Loading state
  if (casesLoading || tasksLoading || contractsLoading || vendorsLoading || usersLoading || calendarEventsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  // Error state
  if (casesError || tasksError || contractsError || vendorsError || usersError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">
          Error loading dashboard data. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const RecentCasesTable = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Cases</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCases.slice(0, 5).map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{caseItem.case_name}</div>
                    <div className="text-sm text-gray-500">{caseItem.case_number}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    caseItem.status === 'open' ? 'bg-green-100 text-green-800' :
                    caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    caseItem.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {caseItem.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    caseItem.priority === 'high' ? 'bg-red-100 text-red-800' :
                    caseItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {caseItem.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {caseItem.filing_date ? format(new Date(caseItem.filing_date), 'MMM dd, yyyy') : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your cases.</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.iconBackground}`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.total}</p>
              </div>
            </div>
            <div className="mt-4">
              {stat.metrics.ytd && (
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">+{stat.metrics.ytd.value} YTD</span>
                </div>
              )}
              {stat.metrics.current && (
                <div className="text-sm text-gray-500">{stat.metrics.current}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <RecentCasesTable />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Tasks</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
                <button 
                  onClick={() => window.location.href = '/calendar'}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {calendarEventsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Loading events...</p>
                  </div>
                ) : upcomingCalendarEvents && upcomingCalendarEvents.length > 0 ? (
                  upcomingCalendarEvents.slice(0, 5).map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      onClick={() => window.location.href = `/calendar?date=${event.start_date}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(event.start_date), 'MMM dd, yyyy')} at {event.start_time}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-400">{event.location}</p>
                        )}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        event.event_type === 'court_date' ? 'bg-red-100 text-red-800' :
                        event.event_type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                        event.event_type === 'deadline' ? 'bg-orange-100 text-orange-800' :
                        event.event_type === 'client_meeting' ? 'bg-purple-100 text-purple-800' :
                        event.event_type === 'internal_meeting' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.event_type.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No upcoming events</p>
                    <button 
                      onClick={() => window.location.href = '/calendar'}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Create your first event
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expiring Contracts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Expiring Contracts</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {expiringContracts.length > 0 ? (
                  expiringContracts.map((contract) => (
                    <div 
                      key={contract.id} 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      onClick={() => handleContractClick(contract.id)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">{contract.title}</p>
                        <p className="text-xs text-gray-500">Expires: {contract.expiryDate}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contract.status === 'warning' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No contracts expiring soon</p>
                    <button 
                      onClick={() => window.location.href = '/contracts'}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all contracts
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Details Modal */}
      <ContractDetailsModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        contractId={selectedContractId}
      />
    </div>
  );
}