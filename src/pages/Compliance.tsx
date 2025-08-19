import React, { useState } from 'react';
import { Plus, Calendar, Users, ChevronDown, Clock, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ComplianceRunForm } from '../components/compliance/ComplianceRunForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { DepartmentCompliance } from '../components/compliance/DepartmentCompliance';
import { GeneralCompliance } from '../components/compliance/GeneralCompliance';

interface Department {
  id: string;
  name: string;
}

interface ComplianceRun {
  id: string;
  title: string;
  description: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually';
  departments: Department[];
  questions: ComplianceQuestion[];
  startDate: Date;
  dueDate: Date;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

interface ComplianceQuestion {
  id: string;
  question: string;
  type: 'text' | 'yesno' | 'multiple' | 'file';
  required: boolean;
  options?: string[];
}

interface ComplianceFilters {
  search: string;
  department: string;
  status: string;
}

export function Compliance() {
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [activeTab, setActiveTab] = useState('department');
  const [filters, setFilters] = useState<ComplianceFilters>({
    search: '',
    department: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tabs = [
    { id: 'upcoming', name: 'Upcoming Runs' },
    { id: 'active', name: 'Active Runs' },
    { id: 'completed', name: 'Completed' },
  ];

  // Sample departments - replace with actual data
  const departments = [
    { id: '1', name: 'Legal' },
    { id: '2', name: 'HR' },
    { id: '3', name: 'Finance' },
    { id: '4', name: 'IT' },
  ];

  // Sample data - replace with actual data
  const sampleRuns: ComplianceRun[] = [
    {
      id: '1',
      title: 'Quarterly Security Assessment',
      description: 'Security compliance check',
      frequency: 'quarterly',
      departments: [departments[0], departments[3]],
      questions: [],
      startDate: new Date(),
      dueDate: new Date(),
      status: 'active',
      createdAt: new Date()
    },
    // Add more sample items...
  ];

  const filteredRuns = sampleRuns.filter(run => {
    const matchesSearch = run.title.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDepartment = !filters.department || 
      run.departments.some(dept => dept.id === filters.department);
    return matchesSearch && matchesDepartment;
  });

  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);
  const paginatedRuns = filteredRuns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async (data: any) => {
    // ... existing submission logic
    
    // Generate unique survey URL
    const surveyUrl = `${window.location.origin}/compliance-survey/${surveyId}`;
    
    // Send email to department heads
    const emailContent = `
      Please complete the compliance survey: ${surveyUrl}
      
      This survey is due by: ${dueDate}
    `;
    
    // ... send email logic
  };

  return (
    <div className="h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Compliance Management</h1>
      </div>

      <Tabs defaultValue="department" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="department">Department Compliance</TabsTrigger>
          <TabsTrigger value="general">General Compliance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="department" className="mt-6">
          <DepartmentCompliance />
        </TabsContent>
        
        <TabsContent value="general" className="mt-6">
          <GeneralCompliance />
        </TabsContent>
      </Tabs>

      {/* Search and Filters */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search compliance runs..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div>
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {paginatedRuns.map((run) => (
              <li key={run.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">{run.title}</p>
                        <p className="text-sm text-gray-500">
                          Due {format(run.dueDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {run.status}
                      </span>
                      <ArrowRight className="ml-4 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {run.departments.length} Departments
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {run.frequency}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredRuns.length)}
                </span>{' '}
                of <span className="font-medium">{filteredRuns.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Page numbers */}
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      currentPage === i + 1
                        ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* New Run Modal */}
      {showNewRunModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Compliance Run</h3>
                  <div className="mt-4">
                    <ComplianceRunForm
                      departments={departments}
                      onSubmit={(data) => {
                        console.log('Form submitted:', data);
                        setShowNewRunModal(false);
                        // Handle form submission
                      }}
                      onCancel={() => setShowNewRunModal(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 