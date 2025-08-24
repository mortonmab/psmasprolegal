import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Users, 
  Briefcase,
  Eye,
  Plus,
  Filter,
  ExternalLink
} from 'lucide-react';
import { lawFirmService } from '../services/lawFirmService';
import { NewLawFirmModal } from '../components/NewLawFirmModal';
import type { LawFirm } from '../lib/types';

interface LawFirmDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawFirm: LawFirm | null;
}

function LawFirmDetailsModal({ isOpen, onClose, lawFirm }: LawFirmDetailsModalProps) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lawFirm) {
      loadLawFirmData();
    }
  }, [isOpen, lawFirm]);

  const loadLawFirmData = async () => {
    if (!lawFirm) return;
    
    setLoading(true);
    try {
      const [contractsData, casesData] = await Promise.all([
        lawFirmService.getLawFirmContracts(lawFirm.id),
        lawFirmService.getLawFirmCases(lawFirm.id)
      ]);
      setContracts(contractsData);
      setCases(casesData);
    } catch (error) {
      console.error('Error loading law firm data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !lawFirm) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${lawFirm.firm_type === 'in_house' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    <Building2 className={`h-6 w-6 ${lawFirm.firm_type === 'in_house' ? 'text-blue-600' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{lawFirm.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {lawFirm.firm_type === 'in_house' ? 'In-House Legal Team' : 'External Law Firm'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Law Firm Details */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                      <div className="space-y-3 text-sm">
                        {lawFirm.contact_person && (
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{lawFirm.contact_person}</span>
                          </div>
                        )}
                        {lawFirm.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a href={`mailto:${lawFirm.email}`} className="text-blue-600 hover:text-blue-800">
                              {lawFirm.email}
                            </a>
                          </div>
                        )}
                        {lawFirm.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <a href={`tel:${lawFirm.phone}`} className="text-blue-600 hover:text-blue-800">
                              {lawFirm.phone}
                            </a>
                          </div>
                        )}
                        {lawFirm.website && (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <a href={lawFirm.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center">
                              Website <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                        {(lawFirm.address || lawFirm.city || lawFirm.state) && (
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              {lawFirm.address && <div>{lawFirm.address}</div>}
                              <div>
                                {[lawFirm.city, lawFirm.state, lawFirm.country, lawFirm.postal_code]
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            </div>
                          </div>
                        )}
                        {lawFirm.specializations && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">Specializations</h5>
                            <p className="text-gray-600">{lawFirm.specializations}</p>
                          </div>
                        )}
                        {lawFirm.bar_number && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">Bar Number</h5>
                            <p className="text-gray-600">{lawFirm.bar_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cases and Contracts */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Cases */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Briefcase className="h-5 w-5 mr-2" />
                        Cases ({cases.length})
                      </h4>
                      {cases.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Case
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Priority
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {cases.map((caseItem) => (
                                  <tr key={caseItem.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{caseItem.case_number}</div>
                                        <div className="text-sm text-gray-500">{caseItem.title}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        caseItem.status === 'open' ? 'bg-green-100 text-green-800' :
                                        caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {caseItem.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        caseItem.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        caseItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {caseItem.priority}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {caseItem.department_name}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No cases assigned to this law firm</p>
                        </div>
                      )}
                    </div>

                    {/* Contracts */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Department Contracts ({contracts.length})
                      </h4>
                      {contracts.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contract
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vendor
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {contracts.map((contract) => (
                                  <tr key={contract.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{contract.contract_number}</div>
                                        <div className="text-sm text-gray-500">{contract.title}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {contract.vendor_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {contract.value && contract.currency ? 
                                        `${contract.currency} ${Number(contract.value).toLocaleString()}` : 
                                        'N/A'
                                      }
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        contract.status === 'active' ? 'bg-green-100 text-green-800' :
                                        contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {contract.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {contract.department_name || 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <svg className="h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p>No contracts found in departments where this law firm has cases</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LawFirms() {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [firmTypeFilter, setFirmTypeFilter] = useState<'all' | 'in_house' | 'external'>('all');
  const [selectedLawFirm, setSelectedLawFirm] = useState<LawFirm | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNewLawFirmModalOpen, setIsNewLawFirmModalOpen] = useState(false);

  useEffect(() => {
    loadLawFirms();
  }, []);

  const loadLawFirms = async () => {
    try {
      const data = await lawFirmService.getAllLawFirms();
      setLawFirms(data);
    } catch (error) {
      console.error('Error loading law firms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLawFirmCreated = (newLawFirm: LawFirm) => {
    setLawFirms(prev => [newLawFirm, ...prev]);
    setIsNewLawFirmModalOpen(false);
  };

  const handleViewDetails = (lawFirm: LawFirm) => {
    setSelectedLawFirm(lawFirm);
    setIsDetailsModalOpen(true);
  };

  const filteredLawFirms = lawFirms.filter(firm => {
    const matchesSearch = firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (firm.specializations && firm.specializations.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (firm.contact_person && firm.contact_person.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = firmTypeFilter === 'all' || firm.firm_type === firmTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const stats = {
    total: lawFirms.length,
    inHouse: lawFirms.filter(f => f.firm_type === 'in_house').length,
    external: lawFirms.filter(f => f.firm_type === 'external').length,
    active: lawFirms.filter(f => f.status === 'active').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Law Firms</h1>
          <p className="text-gray-600">Manage legal counsel and external law firms</p>
        </div>
        <button
          onClick={() => setIsNewLawFirmModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Law Firm
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Law Firms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In-House</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inHouse}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">External Firms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.external}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search law firms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={firmTypeFilter}
              onChange={(e) => setFirmTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="in_house">In-House</option>
              <option value="external">External</option>
            </select>
          </div>
        </div>
      </div>

      {/* Law Firms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLawFirms.map((lawFirm) => (
          <div key={lawFirm.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${lawFirm.firm_type === 'in_house' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  <Building2 className={`h-6 w-6 ${lawFirm.firm_type === 'in_house' ? 'text-blue-600' : 'text-purple-600'}`} />
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  lawFirm.firm_type === 'in_house' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {lawFirm.firm_type === 'in_house' ? 'In-House' : 'External'}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{lawFirm.name}</h3>
              
              {lawFirm.contact_person && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Users className="h-4 w-4 mr-2" />
                  {lawFirm.contact_person}
                </div>
              )}
              
              {lawFirm.email && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Mail className="h-4 w-4 mr-2" />
                  {lawFirm.email}
                </div>
              )}
              
              {lawFirm.phone && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Phone className="h-4 w-4 mr-2" />
                  {lawFirm.phone}
                </div>
              )}
              
              {lawFirm.specializations && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{lawFirm.specializations}</p>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  lawFirm.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {lawFirm.status}
                </span>
                <button
                  onClick={() => handleViewDetails(lawFirm)}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLawFirms.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No law firms found</h3>
          <p className="text-gray-600">
            {searchQuery || firmTypeFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first law firm.'
            }
          </p>
          {!searchQuery && firmTypeFilter === 'all' && (
            <button
              onClick={() => setIsNewLawFirmModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Law Firm
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <LawFirmDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        lawFirm={selectedLawFirm}
      />

      <NewLawFirmModal
        isOpen={isNewLawFirmModalOpen}
        onClose={() => setIsNewLawFirmModalOpen(false)}
        onLawFirmCreated={handleLawFirmCreated}
      />
    </div>
  );
}
