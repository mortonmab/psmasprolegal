import React, { useState } from 'react';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Download,
  Eye,
  FileText,
  History,
  BookOpen,
  AlertCircle,
  Copy
} from 'lucide-react';
import { scrapingService } from '../../services/scrapingService';

interface Legislation {
  id: number;
  title: string;
  number: string;
  year: string;
  type: 'Act' | 'Bill' | 'Amendment';
  status: 'In Force' | 'Repealed' | 'Amended' | 'Draft';
  category: string;
  summary: string;
  pdfUrl: string;
  effectiveDate: string;
  lastAmended?: string;
  tags: string[];
}

export function Legislation() {
  // ... similar state setup as CaseLaw
  
  const categories = [
    'All Categories',
    'Criminal Law',
    'Civil Law',
    'Commercial Law',
    'Constitutional Law',
    'Administrative Law'
  ];

  const types = [
    'All Types',
    'Act',
    'Bill',
    'Amendment'
  ];

  const legislations: Legislation[] = [
    {
      id: 1,
      title: 'Companies Act',
      number: 'Act 71',
      year: '2008',
      type: 'Act',
      status: 'In Force',
      category: 'Commercial Law',
      summary: 'An Act to provide for the incorporation, registration, organization, and management of companies...',
      pdfUrl: '/documents/companies-act.pdf',
      effectiveDate: '2009-05-01',
      lastAmended: '2023-12-01',
      tags: ['companies', 'corporate law', 'business']
    },
    // More mock data...
  ];

  const [selectedLegislation, setSelectedLegislation] = useState<Legislation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('current');

  // Specific features for Legislation
  const handleCitationCopy = (citation: string) => {
    navigator.clipboard.writeText(citation);
    // Add toast notification
  };

  const versionHistory = [
    { version: 'current', date: '2023-12-01', changes: 'Current version' },
    { version: '2.1', date: '2023-06-15', changes: 'Amendment to Section 12' },
    { version: '2.0', date: '2022-11-30', changes: 'Major revision' },
    { version: '1.0', date: '2021-01-01', changes: 'Initial version' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
      {selectedLegislation && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Version Control */}
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {versionHistory.map(v => (
                  <option key={v.version} value={v.version}>
                    Version {v.version} ({v.date})
                  </option>
                ))}
              </select>

              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <History className="h-4 w-4 mr-2" />
                Amendment History
              </button>

              {/* Compare Versions */}
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Compare Versions
              </button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                selectedLegislation.status === 'In Force' 
                  ? 'bg-green-100 text-green-800'
                  : selectedLegislation.status === 'Repealed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <AlertCircle className="h-4 w-4 mr-2" />
                {selectedLegislation.status}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* ... rest of the component */}
    </div>
  );
} 