import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
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
  Users,
  Building2,
  Download,
  FileText
} from 'lucide-react';
import { NewCaseModal } from '../components/NewCaseModal';
import { CaseAssignmentModal } from '../components/CaseAssignmentModal';
import { useCases } from '../hooks/useCases';
import { useAuth } from '../hooks/useAuth';
import { LawFirms } from './LawFirms';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Cases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mainTab, setMainTab] = useState<'my-cases' | 'all-cases' | 'law-firms'>('my-cases');
  const [statusTab, setStatusTab] = useState<'open' | 'closed'>('open');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedCaseForAssignment, setSelectedCaseForAssignment] = useState<{ id: string; name: string } | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const { cases, userCases, loading, error } = useCases();

  // Determine which cases to use based on main tab
  const currentCases = mainTab === 'my-cases' ? userCases : cases;

  // Handle click outside to close export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExportDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative.inline-block.text-left')) {
          setIsExportDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

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
    },
    { 
      name: 'Law Firms', 
      value: 'law-firms', 
      icon: Building2,
      count: null,
      description: 'Manage legal counsel and external law firms'
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

  const handleRowClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const handleMainTabChange = (newTab: 'my-cases' | 'all-cases' | 'law-firms') => {
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

  // Export functions
  const exportToCsv = () => {
    const headers = [
      'Case Number',
      'Case Name',
      'Client',
      'Case Type',
      'Status',
      'Priority',
      'Filing Date',
      'Court',
      'Judge',
      'Opposing Counsel',
      'Estimated Value',
      'Department',
      'Law Firm',
      'Created Date',
      'Updated Date'
    ];

    const csvData = filteredCases.map(caseItem => [
      caseItem.case_number || '',
      caseItem.case_name || '',
      caseItem.client_name || '',
      caseItem.case_type || '',
      caseItem.status || '',
      caseItem.priority || '',
      caseItem.filing_date ? new Date(caseItem.filing_date).toLocaleDateString() : '',
      caseItem.court_name || '',
      caseItem.judge_name || '',
      caseItem.opposing_counsel || '',
      caseItem.estimated_value || '',
      '', // department_name - not available in current Case type
      '', // law_firm_name - not available in current Case type
      new Date(caseItem.created_at).toLocaleDateString(),
      new Date(caseItem.updated_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cases-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cases Export - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; margin-bottom: 20px; }
            .export-info { margin-bottom: 20px; color: #6b7280; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f9fafb; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .status-open { background-color: #d1fae5; color: #065f46; }
            .status-closed { background-color: #f3f4f6; color: #374151; }
            .status-pending { background-color: #fef3c7; color: #92400e; }
            .priority-high { background-color: #fee2e2; color: #991b1b; }
            .priority-medium { background-color: #fef3c7; color: #92400e; }
            .priority-low { background-color: #d1fae5; color: #065f46; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Cases Export Report</h1>
          <div class="export-info">
            <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Cases:</strong> ${filteredCases.length}</p>
            <p><strong>Filter Applied:</strong> ${mainTab === 'my-cases' ? 'My Cases' : 'All Cases'} - ${statusTab === 'open' ? 'Open Cases' : 'Closed Cases'}</p>
            ${searchQuery ? `<p><strong>Search Query:</strong> "${searchQuery}"</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Case Number</th>
                <th>Case Name</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Filing Date</th>
                <th>Court</th>
                <th>Judge</th>
                <th>Estimated Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCases.map(caseItem => `
                <tr>
                  <td>${caseItem.case_number || ''}</td>
                  <td>${caseItem.case_name || ''}</td>
                  <td>${caseItem.client_name || ''}</td>
                  <td>${caseItem.case_type || ''}</td>
                  <td><span class="status-badge status-${caseItem.status}">${caseItem.status || ''}</span></td>
                  <td><span class="status-badge priority-${caseItem.priority}">${caseItem.priority || ''}</span></td>
                  <td>${caseItem.filing_date ? new Date(caseItem.filing_date).toLocaleDateString() : ''}</td>
                  <td>${caseItem.court_name || ''}</td>
                  <td>${caseItem.judge_name || ''}</td>
                  <td>${caseItem.estimated_value || ''}</td>
                  <td>${new Date(caseItem.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            {mainTab === 'law-firms' ? 'Law Firms' : 'Cases'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {mainTab === 'my-cases' 
              ? 'Cases assigned to you or where you are a collaborator. You can edit, make updates, and upload documents to these cases.'
              : mainTab === 'all-cases'
              ? 'All legal cases in the system. You can only edit cases you are assigned to or invited as a collaborator.'
              : 'Manage legal counsel and external law firms assigned to cases.'
            }
          </p>
        </div>
        {mainTab !== 'law-firms' && (
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
        )}
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
                onClick={() => handleMainTabChange(tab.value as 'my-cases' | 'all-cases' | 'law-firms')}
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
                  {tab.count !== null ? tab.count : ''}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Cases Content */}
      {mainTab !== 'law-firms' && (
        <>
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
                        {stat.metrics?.ytd?.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium ${
                          stat.metrics?.ytd?.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.metrics?.ytd?.value}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">MTD</span>
                      <div className="flex items-center">
                        {stat.metrics?.mtd?.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`font-medium ${
                          stat.metrics?.mtd?.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.metrics?.mtd?.value}
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
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-4">
          {/* Export Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              className="group inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            >
              <Download className="h-4 w-4 mr-2 group-hover:animate-bounce" />
              <span className="mr-2">Export</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-white group-hover:text-blue-700 transition-colors duration-200">
                {filteredCases.length}
              </span>
              <svg 
                className={`-mr-1 ml-2 h-4 w-4 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {isExportDropdownOpen && (
              <div className="absolute right-0 z-20 mt-3 w-64 origin-top-right">
                <div className="rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 backdrop-blur-sm border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Export Data</h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                        {filteredCases.length} cases
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Choose your preferred format</p>
                  </div>
                  
                  {/* Options */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        exportToCsv();
                        setIsExportDropdownOpen(false);
                      }}
                      className="group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 transition-all duration-200"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3 text-left flex-1">
                        <div className="font-medium group-hover:text-green-900">Export as CSV</div>
                        <div className="text-xs text-gray-500 group-hover:text-green-600">Spreadsheet format • Excel compatible</div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <svg className="h-4 w-4 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        exportToPdf();
                        setIsExportDropdownOpen(false);
                      }}
                      className="group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 transition-all duration-200"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors duration-200">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="ml-3 text-left flex-1">
                        <div className="font-medium group-hover:text-red-900">Export as PDF</div>
                        <div className="text-xs text-gray-500 group-hover:text-red-600">Professional report • Print ready</div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <svg className="h-4 w-4 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                      Current filters applied: {mainTab === 'my-cases' ? 'My Cases' : 'All Cases'} • {statusTab === 'open' ? 'Open' : 'Closed'}
                      {searchQuery && ` • "${searchQuery}"`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Rows per page selector */}
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
                        {caseItem.department_id || '-'}
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
        </>
      )}

      {/* Law Firms Content */}
      {mainTab === 'law-firms' && (
        <LawFirms />
      )}
    </div>
  );
}