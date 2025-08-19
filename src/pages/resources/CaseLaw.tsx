import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  SortAsc, 
  SortDesc, 
  Download,
  Calendar,
  BookOpen,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  FileText
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { scrapingService } from '../../services/scrapingService';

interface Case {
  id: number;
  title: string;
  citation: string;
  court: 'Constitutional Court' | 'Supreme Court' | 'Commercial Court' | 'High Court';
  date: string;
  summary: string;
  pdfUrl: string;
  judge: string;
  category: string;
  tags: string[];
  parties: {
    plaintiff: string;
    defendant: string;
  };
}

export function CaseLaw() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<string>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Additional filter states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  const courts = [
    'All Courts',
    'Constitutional Court',
    'Supreme Court',
    'Commercial Court',
    'High Court'
  ];

  const categories = [
    'All Categories',
    'Criminal Law',
    'Civil Law',
    'Commercial Law',
    'Constitutional Law',
    'Administrative Law'
  ];

  // Mock data with enhanced details
  const cases: Case[] = [
    {
      id: 1,
      title: 'Smith v. Johnson',
      citation: '[2024] SCC 123',
      court: 'Supreme Court',
      date: '2024-01-15',
      summary: 'Case regarding corporate liability and director responsibilities in the context of environmental damages. The court established new precedent for determining director liability in cases of corporate negligence.',
      pdfUrl: '/documents/smith-v-johnson.pdf',
      judge: 'Hon. Justice Williams',
      category: 'Commercial Law',
      tags: ['corporate liability', 'environmental law', 'director duties'],
      parties: {
        plaintiff: 'John Smith',
        defendant: 'Johnson Corp.'
      }
    },
    // Add more mock cases...
  ];

  // Enhanced filtering logic
  const filteredCases = cases
    .filter(c => {
      const matchesCourt = selectedCourt === 'all' || c.court === selectedCourt;
      const matchesCategory = selectedCategory === 'All Categories' || c.category === selectedCategory;
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.citation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => c.tags.includes(tag));
      const matchesDate = (!dateRange.from || c.date >= dateRange.from) &&
                         (!dateRange.to || c.date <= dateRange.to);
      
      return matchesCourt && matchesCategory && matchesSearch && matchesTags && matchesDate;
    })
    .sort((a, b) => {
      const comparison = a.title.localeCompare(b.title);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const currentCases = filteredCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownload = (caseItem: Case) => {
    // Implement actual download logic here
    window.open(caseItem.pdfUrl, '_blank');
  };

  const fetchCaseLawData = async () => {
    try {
      setIsLoading(true);
      const sources = scrapingService.getSources('case-law');
      const results = await Promise.all(
        sources
          .filter(source => source.enabled)
          .map(source => scrapingService.scrapeContent(source.id, {
            query: searchQuery,
            court: selectedCourt,
            dateFrom: dateRange.from,
            dateTo: dateRange.to
          }))
      );
      
      // Process and combine results
      const combinedResults = results.flat();
      // Update your cases state with the results
      // setCases(combinedResults);
    } catch (error) {
      console.error('Failed to fetch case law:', error);
      // Add error handling here (e.g., toast notification)
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to fetch data when search params change
  useEffect(() => {
    fetchCaseLawData();
  }, [searchQuery, selectedCourt, dateRange.from, dateRange.to]);

  return (
    <div className="h-[calc(100vh-7rem)]">
      <div className="flex h-full space-x-6">
        {/* Left Panel - Case List */}
        <div className="w-1/3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          {/* Enhanced Search and Filters */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {courts.map(court => (
                  <option key={court} value={court === 'All Courts' ? 'all' : court}>
                    {court}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
                <span className="ml-2">Sort</span>
              </button>
            </div>
          </div>

          {/* Cases List with Pagination */}
          <div className="flex-1 overflow-y-auto">
            {currentCases.map((case_) => (
              <button
                key={case_.id}
                onClick={() => setSelectedCase(case_)}
                className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 ${
                  selectedCase?.id === case_.id ? 'bg-blue-50' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-900">{case_.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{case_.citation}</p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {case_.court}
                  </span>
                  <span className="ml-2">{case_.date}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {case_.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
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
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredCases.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredCases.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {/* Pagination buttons */}
                  {/* ... */}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Document Preview and Details */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          {selectedCase ? (
            <>
              {/* Document Actions */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {showDetails ? <Eye className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="ml-2">{showDetails ? 'View Document' : 'View Details'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload(selectedCase)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    <span className="ml-2">Download</span>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              {showDetails ? (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedCase.title}</h2>
                      <p className="mt-1 text-sm text-gray-500">{selectedCase.citation}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Court</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedCase.court}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Judge</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedCase.judge}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Date</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedCase.date}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Category</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedCase.category}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Parties</h3>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Plaintiff</p>
                          <p className="text-sm text-gray-900">{selectedCase.parties.plaintiff}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Defendant</p>
                          <p className="text-sm text-gray-900">{selectedCase.parties.defendant}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Summary</h3>
                      <p className="mt-2 text-sm text-gray-900">{selectedCase.summary}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCase.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <iframe
                  src={selectedCase.pdfUrl}
                  className="flex-1 w-full"
                  title="Case Document Preview"
                />
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Select a case to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 