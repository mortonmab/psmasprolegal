import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertCircle, Edit, Trash2, Filter, Search, RefreshCw, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { GeneralComplianceService, GeneralComplianceRecord, ComplianceFilters } from '../../services/generalComplianceService';
import { GeneralComplianceModal } from '../GeneralComplianceModal';
import { ComplianceRecipientsModal } from '../ComplianceRecipientsModal';
import { useToast } from '../ui/use-toast';

export function GeneralCompliance() {
  const [complianceRecords, setComplianceRecords] = useState<GeneralComplianceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<GeneralComplianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GeneralComplianceRecord | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ComplianceFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GeneralComplianceRecord | null>(null);
  const { toast } = useToast();

  // Ensure initial state is properly set
  useEffect(() => {
    setComplianceRecords([]);
    setFilteredRecords([]);
  }, []);

  useEffect(() => {
    loadComplianceRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [complianceRecords, searchQuery, filters]);

  const loadComplianceRecords = async () => {
    setIsLoading(true);
    try {
      const records = await GeneralComplianceService.getComplianceRecords(filters);
      // Ensure records is always an array
      setComplianceRecords(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error loading compliance records:', error);
      // Set empty array on error to prevent iteration issues
      setComplianceRecords([]);
      toast({
        title: 'Error',
        description: 'Failed to load compliance records',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecords = () => {
    // Ensure complianceRecords is always an array
    const records = Array.isArray(complianceRecords) ? complianceRecords : [];
    let filtered = [...records];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.name.toLowerCase().includes(query) ||
        record.description?.toLowerCase().includes(query) ||
        record.assignedToName?.toLowerCase().includes(query) ||
        record.departmentName?.toLowerCase().includes(query)
      );
    }

    setFilteredRecords(filtered);
  };

  const handleCreateRecord = () => {
    setEditingRecord(undefined);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: GeneralComplianceRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (record: GeneralComplianceRecord) => {
    if (!confirm(`Are you sure you want to delete "${record.name}"?`)) {
      return;
    }

    try {
      await GeneralComplianceService.deleteComplianceRecord(record.id);
      toast({
        title: 'Success',
        description: 'Compliance record deleted successfully'
      });
      loadComplianceRecords();
    } catch (error) {
      console.error('Error deleting compliance record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete compliance record',
        variant: 'destructive'
      });
    }
  };

  const handleManageRecipients = (record: GeneralComplianceRecord) => {
    setSelectedRecord(record);
    setIsRecipientsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadComplianceRecords();
  };

  const handleFilterChange = (key: keyof ComplianceFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getStatusIcon = (record: GeneralComplianceRecord) => {
    if (GeneralComplianceService.isOverdue(record)) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (GeneralComplianceService.isDueSoon(record)) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <Calendar className="h-4 w-4 text-gray-400" />;
  };

  const getDaysUntilDue = (record: GeneralComplianceRecord) => {
    const days = GeneralComplianceService.getDaysUntilDueForRecord(record);
    if (days < 0) {
      return `${Math.abs(days)} days overdue`;
    } else if (days === 0) {
      return 'Due today';
    } else if (days === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${days} days`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">General Compliance Records</h2>
          <p className="text-sm text-gray-500">
            Manage various compliance documents and renewals with due dates
          </p>
        </div>
        <Button onClick={handleCreateRecord}>
          <Plus className="h-4 w-4 mr-2" />
          Add Compliance Record
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search compliance records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {GeneralComplianceService.getStatusOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  {GeneralComplianceService.getPriorityOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.complianceType || ''}
                  onChange={(e) => handleFilterChange('complianceType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {GeneralComplianceService.getComplianceTypeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || Object.keys(filters).length > 0 ? 'No matching records' : 'No compliance records'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || Object.keys(filters).length > 0 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first compliance record'
              }
            </p>
            {!searchQuery && Object.keys(filters).length === 0 && (
              <Button onClick={handleCreateRecord}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Record
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <li key={record.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(record)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {record.name}
                        </h3>
                        {record.description && (
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {record.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GeneralComplianceService.getComplianceTypeColor(record.complianceType)}`}>
                            {GeneralComplianceService.getComplianceTypeOptions().find(opt => opt.value === record.complianceType)?.label}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GeneralComplianceService.getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GeneralComplianceService.getPriorityColor(record.priority)}`}>
                            {record.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            {GeneralComplianceService.getFrequencyOptions().find(opt => opt.value === record.frequency)?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end text-sm text-gray-500">
                                             <div className="flex items-center">
                         <Calendar className="h-4 w-4 mr-1" />
                         <span>{GeneralComplianceService.getDueDateDisplayText(record)}</span>
                       </div>
                      <span className={`text-xs ${GeneralComplianceService.isOverdue(record) ? 'text-red-600 font-medium' : GeneralComplianceService.isDueSoon(record) ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                        {getDaysUntilDue(record)}
                      </span>
                      {record.assignedToName && (
                        <span className="text-xs text-gray-400">
                          Assigned: {record.assignedToName}
                        </span>
                      )}
                      {record.departmentName && (
                        <span className="text-xs text-gray-400">
                          Dept: {record.departmentName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageRecipients(record)}
                        title="Manage Reminder Recipients"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRecord(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRecord(record)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      <GeneralComplianceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        record={editingRecord}
        mode={editingRecord ? 'edit' : 'create'}
      />

      {/* Recipients Modal */}
      {selectedRecord && (
        <ComplianceRecipientsModal
          isOpen={isRecipientsModalOpen}
          onClose={() => {
            setIsRecipientsModalOpen(false);
            setSelectedRecord(null);
          }}
          complianceRecordId={selectedRecord.id}
          complianceRecordName={selectedRecord.name}
        />
      )}
    </div>
  );
} 