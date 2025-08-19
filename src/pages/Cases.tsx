import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Clock, 
  Filter, 
  Briefcase,
  Scale,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Users
} from 'lucide-react';
import { NewCaseModal } from '../components/NewCaseModal';
import { CaseAssignmentModal } from '../components/CaseAssignmentModal';
import { useCases } from '../hooks/useCases';
import { useAuth } from '../hooks/useAuth';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Cases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mainTab, setMainTab] = useState<'my-cases' | 'all-cases'>('my-cases');
  const [statusTab, setStatusTab] = useState<'open' | 'closed'>('open');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedCaseForAssignment, setSelectedCaseForAssignment] = useState<{ id: string; name: string } | null>(null);
  const { cases, userCases, loading, error } = useCases();

  // Determine which cases to use based on main tab
  const currentCases = mainTab === 'my-cases' ? userCases : cases;

  // Main tabs for case ownership
  const mainTabs = [
    { 
      name: 'My Cases', 
      value: 'my-cases', 
      icon: User,
      count: userCases.length,
      description: 'Cases assigned to you or where you are a collaborator'
    },
    { 
      name: 'All Cases', 
      value: 'all-cases', 
      icon: Users,
      count: cases.length,
      description: 'All cases in the system'
    }
  ];

  // Status tabs within each main tab
  const statusTabs = [
    { 
      name: 'Open Cases', 
      value: 'open', 
      count: currentCases.filter(c => c.status === 'open' || c.status === 'pending').length 
    },
    { 
      name: 'Closed Cases', 
      value: 'closed', 
      count: currentCases.filter(c => c.status === 'closed').length 
    }
  ];

  // Quick stats for current view
  const caseStats = [
    {
      name: 'Total Cases',
      total: currentCases.length,
      icon: Briefcase,
      iconBackground: 'bg-blue-100',
      iconColor: 'text-blue-600',
      metrics: {
        ytd: { value: currentCases.filter(c => 
          new Date(c.created_at).getFullYear() === new Date().getFullYear()
        ).length, trend: 'up' },
        mtd: { value: currentCases.filter(c => 
          new Date(c.created_at).getMonth() === new Date().getMonth()
        ).length, trend: 'up' }
      }
    },
    {
      name: 'Active Cases',
      total: currentCases.filter(c => c.status === 'open').length,
      icon: Scale,
      iconBackground: 'bg-green-100',
      iconColor: 'text-green-600',
      metrics: {
        current: `${Math.round((currentCases.filter(c => c.status === 'open').length / currentCases.length) * 100)}% of total`
      }
    },
    {
      name: 'High Priority',
      total: currentCases.filter(c => c.priority === 'high').length,
      icon: AlertTriangle,
      iconBackground: 'bg-red-100',
      iconColor: 'text-red-600',
      metrics: {
        current: `${currentCases.filter(c => c.priority === 'high' && c.status === 'open').length} require immediate action`
      }
    },
    {
      name: 'Closed Cases',
      total: currentCases.filter(c => c.status === 'closed').length,
      icon: CheckCircle2,
      iconBackground: 'bg-gray-100',
      iconColor: 'text-gray-600',
      metrics: {
        ytd: { value: currentCases.filter(c => 
          c.status === 'closed' && 
          new Date(c.updated_at).getFullYear() === new Date().getFullYear()
        ).length, trend: 'up' },
        mtd: { value: currentCases.filter(c => 
          c.status === 'closed' && 
          new Date(c.updated_at).getMonth() === new Date().getMonth()
        ).length, trend: 'up' }
      }
    }
  ];

  // Filter and paginate cases
  const filteredCases = useMemo(() => {
    return currentCases
      .filter(caseItem => {
        // First filter by status tab
        if (statusTab === 'open') {
          return caseItem.status === 'open' || caseItem.status === 'pending';
        } else {
          return caseItem.status === 'closed';
        }
      })
      .filter(caseItem => 
        // Then filter by search query
        Object.values(caseItem).some(value => 
          value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
  }, [currentCases, searchQuery, statusTab]);

  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredCases.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCases, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredCases.length / rowsPerPage);

  const handleRowClick = (caseId: number) => {
    navigate(`/cases/${caseId}`);
  };

  const handleMainTabChange = (newTab: 'my-cases' | 'all-cases') => {
    setMainTab(newTab);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  const handleStatusTabChange = (newTab: 'open' | 'closed') => {
    setStatusTab(newTab);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  // Check if user can edit a case (collaborator)
  const canEditCase = (caseItem: any) => {
    if (!user) return false;
    return userCases.some(uc => uc.id === caseItem.id);
  };

  // Check if user is an administrator
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Handle assignment success
  const handleAssignmentSuccess = () => {
    // Refresh the cases data
    window.location.reload();
  };

  // Open assignment modal for a specific case
  const openAssignmentModal = (caseItem: any) => {
    setSelectedCaseForAssignment({ id: caseItem.id, name: caseItem.case_name });
    setIsAssignmentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Cases</h1>
          <p className="mt-2 text-sm text-gray-700">
            {mainTab === 'my-cases' 
              ? 'Cases assigned to you or where you are a collaborator. You can edit, make updates, and upload documents to these cases.'
              : 'All legal cases in the system. You can only edit cases you are assigned to or invited as a collaborator.'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsNewCaseModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add case
          </button>
        </div>
      </div>

      <NewCaseModal 
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
      />

      {/* Case Assignment Modal */}
      {selectedCaseForAssignment && (
        <CaseAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setSelectedCaseForAssignment(null);
          }}
          caseId={selectedCaseForAssignment.id}
          caseName={selectedCaseForAssignment.name}
          onAssignmentSuccess={handleAssignmentSuccess}
        />
      )}

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Main Tabs">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => handleMainTabChange(tab.value as 'my-cases' | 'all-cases')}
                className={classNames(
                  tab.value === mainTab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm'
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
                <span
                  className={classNames(
                    tab.value === mainTab
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-900',
                    'ml-3 hidden sm:inline-block py-0.5 px-2.5 rounded-full text-xs'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {caseStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.iconBackground}`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.total}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                {'metrics' in stat && 'ytd' in stat.metrics ? (
                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500">YTD</span>
                      <div className="flex items-center">
                        {stat.metrics.ytd.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium ${
                          stat.metrics.ytd.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.metrics.ytd.value}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">MTD</span>
                      <div className="flex items-center">
                        {stat.metrics.mtd.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium ${
                          stat.metrics.mtd.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.metrics.mtd.value}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {stat.metrics.current}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Status Tabs">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusTabChange(tab.value as 'open' | 'closed')}
              className={classNames(
                tab.value === statusTab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'whitespace-nowrap flex py-4 px-1 border-b-2 font-medium text-sm'
              )}
            >
              {tab.name}
              <span
                className={classNames(
                  tab.value === statusTab
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900',
                  'ml-3 hidden sm:inline-block py-0.5 px-2.5 rounded-full text-xs'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
            <option value={30}>30 rows</option>
            <option value={filteredCases.length}>All</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="mt-2 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Case Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Department
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date Opened
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Assigned Members
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Access
                    </th>
                    {isAdmin() && (
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedCases.map((caseItem) => (
                    <tr 
                      key={caseItem.id} 
                      className={classNames(
                        "hover:bg-gray-50 cursor-pointer",
                        canEditCase(caseItem) ? "" : "opacity-75"
                      )}
                      onClick={() => handleRowClick(caseItem.id)}
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-blue-600 sm:pl-6">
                        {caseItem.case_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {caseItem.department}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          caseItem.status === 'open' ? 'bg-green-100 text-green-800' : 
                          caseItem.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {caseItem.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : ''}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {caseItem.assigned_members || 'No assignments'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {canEditCase(caseItem) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Full Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            View Only
                          </span>
                        )}
                      </td>
                      {isAdmin() && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignmentModal(caseItem);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 hover:bg-gray-50"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Assign
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * rowsPerPage) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * rowsPerPage, filteredCases.length)}
              </span> of{' '}
              <span className="font-medium">{filteredCases.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}