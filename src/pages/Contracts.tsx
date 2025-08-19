import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  File,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewContractModal } from '../components/NewContractModal';
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
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            onClick={() => setIsNewContractOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New contract
          </button>
        </div>
      </div>

      {/* Render the modal */}
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => { setIsNewContractOpen(false); fetchData(); }}
        onContractCreated={(contract) => setContracts(prev => [contract, ...prev])}
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