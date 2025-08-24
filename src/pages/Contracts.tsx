import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  File,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Download,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewContractModal } from '../components/NewContractModal';
import { ContractUploadModal } from '../components/ContractUploadModal';
import { contractService } from '../services/contractService';
import type { Contract } from '../lib/types';
import { contractTypeService, ContractType } from '../services/contractTypeService';
import { departmentService } from '../services/departmentService';
import { vendorService } from '../services/vendorService';
import type { Department, Vendor } from '../lib/types';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Contracts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentTab, setCurrentTab] = useState<'active' | 'expired'>('active');
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractStats, setContractStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiringSoon: 0,
    expiringThisWeek: 0,
    activePercentage: 0
  });
  const navigate = useNavigate();

  // Fetch contracts and related data
  const fetchData = async () => {
    try {
      const [contractsData, contractTypesData, departmentsData, vendorsData, statsData] = await Promise.all([
        contractService.getAllContracts(),
        contractTypeService.getAllContractTypes(),
        departmentService.getAllDepartments(),
        vendorService.getAllVendors(),
        contractService.getContractStats()
      ]);
      setContracts(contractsData);
      setContractTypes(contractTypesData);
      setDepartments(departmentsData);
      setVendors(vendorsData);
      setContractStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Export functions
  const exportToCsv = () => {
    const headers = [
      'Contract Number',
      'Title',
      'Vendor',
      'Department',
      'Contract Type',
      'Status',
      'Start Date',
      'End Date',
      'Value',
      'Currency',
      'Payment Terms',
      'Created Date',
      'Updated Date'
    ];

    const csvData = filteredContracts.map(contract => [
      contract.contract_number || '',
      contract.title || '',
      getVendorName(contract.vendor_id) || '',
      getDepartmentName(contract.department_id) || '',
      getContractTypeName(contract.contract_type_id) || '',
      contract.status || '',
      contract.start_date ? new Date(contract.start_date).toLocaleDateString() : '',
      contract.end_date ? new Date(contract.end_date).toLocaleDateString() : '',
      contract.value || '',
      contract.currency || '',
      contract.payment_terms || '',
      new Date(contract.created_at).toLocaleDateString(),
      new Date(contract.updated_at).toLocaleDateString()
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
    link.setAttribute('download', `contracts-export-${new Date().toISOString().split('T')[0]}.csv`);
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
          <title>Contracts Export - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; margin-bottom: 20px; }
            .export-info { margin-bottom: 20px; color: #6b7280; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f9fafb; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .status-active { background-color: #d1fae5; color: #065f46; }
            .status-expired { background-color: #fee2e2; color: #991b1b; }
            .status-draft { background-color: #f3f4f6; color: #374151; }
            .status-terminated { background-color: #fef3c7; color: #92400e; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Contracts Export Report</h1>
          <div class="export-info">
            <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Contracts:</strong> ${filteredContracts.length}</p>
            <p><strong>Filter Applied:</strong> ${currentTab === 'active' ? 'Active Contracts' : 'Expired Contracts'}</p>
            ${searchQuery ? `<p><strong>Search Query:</strong> "${searchQuery}"</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Contract Number</th>
                <th>Title</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${filteredContracts.map(contract => `
                <tr>
                  <td>${contract.contract_number || ''}</td>
                  <td>${contract.title || ''}</td>
                  <td>${getVendorName(contract.vendor_id) || ''}</td>
                  <td>${getContractTypeName(contract.contract_type_id) || ''}</td>
                  <td><span class="status-badge status-${contract.status}">${contract.status || ''}</span></td>
                  <td>${contract.start_date ? new Date(contract.start_date).toLocaleDateString() : ''}</td>
                  <td>${contract.end_date ? new Date(contract.end_date).toLocaleDateString() : ''}</td>
                  <td>${contract.value ? `${contract.currency || ''} ${contract.value}` : ''}</td>
                  <td>${new Date(contract.created_at).toLocaleDateString()}</td>
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

  // Helper functions for export
  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return '';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || '';
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '';
    const department = departments.find(d => d.id === departmentId);
    return department?.name || '';
  };

  const getContractTypeName = (contractTypeId?: string) => {
    if (!contractTypeId) return '';
    const contractType = contractTypes.find(ct => ct.id === contractTypeId);
    return contractType?.name || '';
  };

  // Quick stats
  const quickStats = [
    {
      name: 'Total Contracts',
      total: contractStats.totalContracts,
      icon: File,
      iconBackground: 'bg-blue-100',
      iconColor: 'text-blue-600',
      metrics: {
        ytd: { value: 15, trend: 'up' },
        mtd: { value: 3, trend: 'up' }
      }
    },
    {
      name: 'Active Contracts',
      total: contractStats.activeContracts,
      icon: CheckCircle2,
      iconBackground: 'bg-green-100',
      iconColor: 'text-green-600',
      metrics: {
        current: `${contractStats.activePercentage}% of total`
      }
    },
    {
      name: 'Expiring Soon',
      total: contractStats.expiringSoon,
      icon: AlertTriangle,
      iconBackground: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      metrics: {
        current: `${contractStats.expiringThisWeek} in next 7 days`
      }
    }
  ];

  // Tabs configuration
  const tabs = [
    { name: 'Active Contracts', value: 'active', count: contracts.filter(c => c.status === 'active').length },
    { name: 'Expired Contracts', value: 'expired', count: contracts.filter(c => c.status === 'expired').length }
  ];

  // Filter and paginate contracts
  const filteredContracts = useMemo(() => {
    return contracts
      .filter(contract => {
        // First filter by status tab
        if (currentTab === 'active') {
          return contract.status === 'active';
        } else {
          return contract.status === 'expired';
        }
      })
      .filter(contract => 
        Object.values(contract).some(value => 
          value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
  }, [contracts, searchQuery, currentTab]);

  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredContracts.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredContracts, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredContracts.length / rowsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all contracts including their status, type, and involved parties.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => setIsNewContractOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New contract
          </button>
        </div>
      </div>

      {/* Render the modals */}
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => { setIsNewContractOpen(false); fetchData(); }}
        onContractCreated={(contract) => setContracts(prev => [contract, ...prev])}
      />
      
      <ContractUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchData}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickStats.map((stat) => {
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setCurrentTab(tab.value as 'active' | 'expired');
                setCurrentPage(1);
              }}
              className={classNames(
                tab.value === currentTab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'whitespace-nowrap flex py-4 px-1 border-b-2 font-medium text-sm'
              )}
            >
              {tab.name}
              <span className={classNames(
                tab.value === currentTab
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-900',
                'ml-3 hidden sm:inline-block py-0.5 px-2.5 rounded-full text-xs'
              )}>
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
            placeholder="Search contracts..."
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
                {filteredContracts.length}
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
                        {filteredContracts.length} contracts
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
                      Current filters applied: {currentTab === 'active' ? 'Active' : 'Expired'} Contracts
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
            <option value={filteredContracts.length}>All</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="mt-2 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Contract Title
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contract Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Vendors
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Value
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      End Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Department
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedContracts.map((contract) => (
                    <tr 
                      key={contract.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-blue-600 sm:pl-6">
                        {contract.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {contractTypes.find(ct => ct.id === contract.contract_type_id)?.name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {contract.vendor_ids && Array.isArray(contract.vendor_ids) 
                          ? contract.vendor_ids.map(vendorId => 
                              vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor'
                            ).join(' • ')
                          : contract.vendor_id 
                            ? vendors.find(v => v.id === contract.vendor_id)?.name || 'Unknown Vendor'
                            : 'No vendors'
                        }
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {contract.value}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {departments.find(d => d.id === contract.department_id)?.name || 'N/A'}
                      </td>
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
                {Math.min(currentPage * rowsPerPage, filteredContracts.length)}
              </span> of{' '}
              <span className="font-medium">{filteredContracts.length}</span> results
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