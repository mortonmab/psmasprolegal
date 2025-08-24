import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { TimesheetService, CreateTimesheetEntry } from '../services/timesheetService';
import { caseService } from '../services/caseService';
import { contractService } from '../services/contractService';
import type { Case, Contract } from '../lib/types';

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultDate?: Date;
}

export function TimeEntryModal({ isOpen, onClose, onSaved, defaultDate }: TimeEntryModalProps) {
  const [entryDate, setEntryDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Case Work' | 'Client Meeting' | 'Court Appearance' | 'Research' | 'Administrative' | 'Other'>('Case Work');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Data for dropdowns
  const [cases, setCases] = useState<Case[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [contractsLoading, setContractsLoading] = useState(false);
  
  // Search states
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [showContractDropdown, setShowContractDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) {
        setEntryDate(defaultDate.toISOString().split('T')[0]);
      } else if (!entryDate) {
        setEntryDate(new Date().toISOString().split('T')[0]);
      }
      loadCasesAndContracts();
    }
  }, [isOpen, defaultDate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCaseDropdown(false);
        setShowContractDropdown(false);
      }
    };

    if (showCaseDropdown || showContractDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCaseDropdown, showContractDropdown]);

  const loadCasesAndContracts = async () => {
    setCasesLoading(true);
    setContractsLoading(true);
    try {
      const [casesData, contractsData] = await Promise.all([
        caseService.getAllCases(),
        contractService.getAllContracts()
      ]);
      setCases(casesData || []);
      setContracts(contractsData || []);
    } catch (error) {
      console.error('Error loading cases and contracts:', error);
    } finally {
      setCasesLoading(false);
      setContractsLoading(false);
    }
  };

  const computedHours = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      const diff = Math.max(0, end - start);
      return Math.round((diff / 60) * 100) / 100;
    } catch {
      return 0;
    }
  }, [startTime, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: CreateTimesheetEntry = {
        entry_date: entryDate,
        start_time: startTime,
        end_time: endTime,
        description: description || undefined,
        category,
        case_id: selectedCaseId || null,
        contract_id: selectedContractId || null,
        hours: computedHours,
      };
      await TimesheetService.createEntry(payload);
      onSaved();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating timesheet entry:', error);
      alert('Failed to save time entry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setSelectedCaseId('');
    setSelectedContractId('');
    setCaseSearchQuery('');
    setContractSearchQuery('');
    setShowCaseDropdown(false);
    setShowContractDropdown(false);
  };

  // Filter cases and contracts based on search query
  const filteredCases = cases.filter(c => 
    c.case_number.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
    c.case_name.toLowerCase().includes(caseSearchQuery.toLowerCase())
  );

  const filteredContracts = contracts.filter(c => 
    c.contract_number.toLowerCase().includes(contractSearchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(contractSearchQuery.toLowerCase())
  );

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedContract = contracts.find(c => c.id === selectedContractId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Time Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Case Work</option>
                <option>Client Meeting</option>
                <option>Court Appearance</option>
                <option>Research</option>
                <option>Administrative</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What did you work on?" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case Selection */}
            <div className="relative dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">Case (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedCase ? `${selectedCase.case_number} - ${selectedCase.case_name}` : caseSearchQuery}
                  onChange={(e) => {
                    setCaseSearchQuery(e.target.value);
                    setShowCaseDropdown(true);
                    if (!e.target.value) setSelectedCaseId('');
                  }}
                  onFocus={() => setShowCaseDropdown(true)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search cases..."
                />
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                
                {showCaseDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {casesLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Loading cases...</div>
                    ) : filteredCases.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No cases found</div>
                    ) : (
                      <>
                        <div 
                          className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b"
                          onClick={() => {
                            setSelectedCaseId('');
                            setCaseSearchQuery('');
                            setShowCaseDropdown(false);
                          }}
                        >
                          <span className="text-gray-500">No case selected</span>
                        </div>
                        {filteredCases.map(case_ => (
                          <div
                            key={case_.id}
                            className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setSelectedCaseId(case_.id);
                              setCaseSearchQuery('');
                              setShowCaseDropdown(false);
                            }}
                          >
                            <div className="font-medium">{case_.case_number}</div>
                            <div className="text-gray-600 text-xs">{case_.case_name}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contract Selection */}
            <div className="relative dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contract (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedContract ? `${selectedContract.contract_number} - ${selectedContract.title}` : contractSearchQuery}
                  onChange={(e) => {
                    setContractSearchQuery(e.target.value);
                    setShowContractDropdown(true);
                    if (!e.target.value) setSelectedContractId('');
                  }}
                  onFocus={() => setShowContractDropdown(true)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search contracts..."
                />
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                
                {showContractDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {contractsLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Loading contracts...</div>
                    ) : filteredContracts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No contracts found</div>
                    ) : (
                      <>
                        <div 
                          className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b"
                          onClick={() => {
                            setSelectedContractId('');
                            setContractSearchQuery('');
                            setShowContractDropdown(false);
                          }}
                        >
                          <span className="text-gray-500">No contract selected</span>
                        </div>
                        {filteredContracts.map(contract => (
                          <div
                            key={contract.id}
                            className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setSelectedContractId(contract.id);
                              setContractSearchQuery('');
                              setShowContractDropdown(false);
                            }}
                          >
                            <div className="font-medium">{contract.contract_number}</div>
                            <div className="text-gray-600 text-xs">{contract.title}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-gray-500">Hours: <span className="font-medium text-gray-900">{computedHours.toFixed(2)}</span></span>
            <div className="space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Saving...' : 'Save Entry'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


