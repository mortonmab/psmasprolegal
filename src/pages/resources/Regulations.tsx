import React, { useState } from 'react';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Download,
  Eye,
  FileText,
  Link as LinkIcon, 
  AlertCircle, 
  BookOpen 
} from 'lucide-react';
import { scrapingService } from '../../services/scrapingService';

interface Regulation {
  id: number;
  title: string;
  number: string;
  year: string;
  parentAct: string;
  status: 'Current' | 'Superseded' | 'Draft';
  issuingBody: string;
  category: string;
  summary: string;
  pdfUrl: string;
  effectiveDate: string;
  lastUpdated?: string;
  tags: string[];
}

export function Regulations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [showRelatedLegislation, setShowRelatedLegislation] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedIssuingBody, setSelectedIssuingBody] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const issuingBodies = [
    'All Bodies',
    'Ministry of Justice',
    'Ministry of Finance',
    'Ministry of Trade',
    'Central Bank'
  ];

  const regulations: Regulation[] = [
    {
      id: 1,
      title: 'Companies Regulations',
      number: 'R. 619',
      year: '2009',
      parentAct: 'Companies Act 71 of 2008',
      status: 'Current',
      issuingBody: 'Ministry of Trade',
      category: 'Commercial Law',
      summary: 'Regulations prescribing matters relating to the Companies Act...',
      pdfUrl: '/documents/companies-regulations.pdf',
      effectiveDate: '2009-05-01',
      lastUpdated: '2023-12-01',
      tags: ['companies', 'compliance', 'registration']
    },
    // More mock data...
  ];

  // Filter regulations
  const filteredRegulations = regulations.filter(reg => 
    (selectedIssuingBody === 'all' || reg.issuingBody === selectedIssuingBody) &&
    (reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     reg.number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredRegulations.length / itemsPerPage);
  const currentRegulations = filteredRegulations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Related legislation panel
  const RelatedLegislationPanel = () => (
    <div className="border-l border-gray-200 w-64 p-4 overflow-y-auto">
      <h3 className="font-medium text-gray-900">Related Legislation</h3>
      <ul className="mt-4 space-y-4">
        <li className="flex items-start">
          <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">Companies Act 71 of 2008</span>
        </li>
        {/* More related items */}
      </ul>
    </div>
  );

  // Public comments section
  const CommentsPanel = () => (
    <div className="border-t border-gray-200 p-4">
      <h3 className="font-medium text-gray-900">Public Comments</h3>
      {/* Comments implementation */}
    </div>
  );

  return (
    <div className="h-[calc(100vh-7rem)]">
      <div className="flex h-full space-x-6">
        {/* Left Panel - Regulations List */}
        <div className="w-1/3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search regulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              value={selectedIssuingBody}
              onChange={(e) => setSelectedIssuingBody(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {issuingBodies.map(body => (
                <option key={body} value={body === 'All Bodies' ? 'all' : body}>
                  {body}
                </option>
              ))}
            </select>
          </div>

          {/* Regulations List */}
          <div className="flex-1 overflow-y-auto">
            {currentRegulations.map((regulation) => (
              <button
                key={regulation.id}
                onClick={() => setSelectedRegulation(regulation)}
                className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 ${
                  selectedRegulation?.id === regulation.id ? 'bg-blue-50' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-900">{regulation.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{regulation.number}</p>
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {regulation.status}
                  </span>
                  <span>{regulation.issuingBody}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Right Panel - Document Preview and Details */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          {selectedRegulation ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowRelatedLegislation(!showRelatedLegislation)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Related Legislation
                  </button>
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Public Comments
                  </button>
                </div>
              </div>

              <div className="flex-1 flex">
                <div className={`flex-1 ${showRelatedLegislation ? 'border-r border-gray-200' : ''}`}>
                  <iframe
                    src={selectedRegulation.pdfUrl}
                    className="w-full h-full"
                    title="Regulation Document Preview"
                  />
                </div>
                {showRelatedLegislation && <RelatedLegislationPanel />}
              </div>
              {showComments && <CommentsPanel />}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Select a regulation to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 