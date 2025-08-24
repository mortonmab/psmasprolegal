import React, { useState, useEffect } from 'react';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Download,
  Eye,
  FileText,
  Link as LinkIcon, 
  AlertCircle, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Calendar,
  Tag,
  MapPin,
  Upload
} from 'lucide-react';
import { scrapingService, ScrapedData } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';
import { ManualUploadModal } from '../../components/ManualUploadModal';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';

interface Regulation {
  id: string;
  title: string;
  number: string;
  year: string;
  parentAct: string;
  status: 'Current' | 'Superseded' | 'Draft';
  issuingBody: string;
  category: string;
  summary: string;
  fullContent: string;
  source_url?: string;
  effectiveDate: string;
  lastUpdated?: string;
  tags: string[];
}

export function Regulations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssuingBody, setSelectedIssuingBody] = useState<string>('All Bodies');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [totalRegulations, setTotalRegulations] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  const issuingBodies = [
    'All Bodies',
    'Ministry of Justice',
    'Ministry of Finance',
    'Ministry of Trade',
    'Central Bank',
    'Department of Health',
    'Department of Education'
  ];

  const statuses = [
    'All Statuses',
    'Current',
    'Superseded',
    'Draft'
  ];

  const categories = [
    'All Categories',
    'Criminal Law',
    'Civil Law',
    'Commercial Law',
    'Constitutional Law',
    'Administrative Law'
  ];

  // Fetch regulations from API
  const fetchRegulations = async () => {
    setIsLoading(true);
    try {
      const response = await scrapingService.getScrapedData({
        source_type: 'regulation',
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: 'date_published',
        sort_order: sortDirection
      });

      if (response) {
        const mappedRegulations: Regulation[] = response.data.map((item: ScrapedData) => ({
          id: item.id,
          title: item.title,
          number: extractNumberFromTitle(item.title),
          year: extractYearFromContent(item.content),
          fullContent: item.content,
          parentAct: extractParentAct(item.content),
          status: determineStatus(item.content),
          issuingBody: extractIssuingBody(item.content),
          category: determineCategory(item.content),
          summary: item.content.substring(0, 300) + '...',
          source_url: item.source_url,
          effectiveDate: item.date_published || item.scraped_at,
          lastUpdated: extractLastUpdated(item.content),
          tags: item.keywords ? item.keywords.split(',').map(k => k.trim()) : []
        }));

        setRegulations(mappedRegulations);
        setTotalRegulations(response.pagination.total);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching regulations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch regulations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to extract information from content
  const extractNumberFromTitle = (title: string): string => {
    const numberMatch = title.match(/(?:Regulation|R\.)\s*(\d+)/i);
    return numberMatch ? numberMatch[1] : 'N/A';
  };

  const extractYearFromContent = (content: string): string => {
    const yearMatch = content.match(/(?:19|20)\d{2}/);
    return yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  };

  const extractParentAct = (content: string): string => {
    const actMatch = content.match(/(?:under|pursuant to|in terms of)\s+([^,\.]+(?:Act|Bill|Legislation))/i);
    return actMatch ? actMatch[1].trim() : 'Not specified';
  };

  const determineStatus = (content: string): 'Current' | 'Superseded' | 'Draft' => {
    if (/superseded|replaced/i.test(content)) return 'Superseded';
    if (/draft|proposed/i.test(content)) return 'Draft';
    return 'Current';
  };

  const extractIssuingBody = (content: string): string => {
    const bodyPatterns = [
      /(?:by|from|issued by)\s+(Ministry of [^,\.]+)/i,
      /(?:by|from|issued by)\s+(Department of [^,\.]+)/i,
      /(?:by|from|issued by)\s+(Central Bank)/i
    ];
    
    for (const pattern of bodyPatterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    return 'Not specified';
  };

  const determineCategory = (content: string): string => {
    const categoryPatterns = [
      { pattern: /criminal/i, category: 'Criminal Law' },
      { pattern: /civil/i, category: 'Civil Law' },
      { pattern: /commercial|corporate/i, category: 'Commercial Law' },
      { pattern: /constitutional/i, category: 'Constitutional Law' },
      { pattern: /administrative/i, category: 'Administrative Law' }
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(content)) {
        return category;
      }
    }
    return 'General Law';
  };

  const extractLastUpdated = (content: string): string | undefined => {
    const updatedMatch = content.match(/(?:updated|amended|revised).*?(?:19|20)\d{2}/i);
    return updatedMatch ? updatedMatch[0] : undefined;
  };

  // Fetch regulations when dependencies change
  useEffect(() => {
    fetchRegulations();
  }, [currentPage, searchQuery, sortDirection]);

  // Enhanced filtering logic
  const filteredRegulations = regulations.filter(r => {
    const matchesBody = selectedIssuingBody === 'All Bodies' || r.issuingBody === selectedIssuingBody;
    const matchesStatus = selectedStatus === 'All Statuses' || r.status === selectedStatus;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.number && r.number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesBody && matchesStatus && matchesSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRegulations();
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRegulationClick = (regulation: Regulation) => {
    setSelectedDocument({
      id: regulation.id,
      title: regulation.title,
      content: regulation.fullContent,
      date: regulation.effectiveDate,
      source_url: regulation.source_url,
      tags: regulation.tags,
      type: 'Regulation',
      category: regulation.category,
      jurisdiction: 'Zimbabwe'
    });
    setShowDocumentPreview(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedRegulation(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regulations</h1>
          <p className="text-gray-600">Search and browse through regulations and statutory instruments</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalRegulations} regulations found
          </span>
          <ManualUploadModal 
            onUploadSuccess={() => {
              // Refresh the regulations list
              fetchRegulations();
            }}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search regulations by title, number, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Issuing Body Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Issuing Body:</label>
              <select
                value={selectedIssuingBody}
                onChange={(e) => setSelectedIssuingBody(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {issuingBodies.map(body => (
                  <option key={body} value={body === 'All Bodies' ? 'all' : body}>{body}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Sort Direction */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <button
                type="button"
                onClick={() => handleSort(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="flex items-center space-x-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                <span>{sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Regulations List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading regulations...</div>
          </div>
        ) : filteredRegulations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No regulations found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRegulations.map((regulation) => (
              <div key={regulation.id} className="p-6 hover:bg-gray-50 cursor-pointer" onClick={() => handleRegulationClick(regulation)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{regulation.title}</h3>
                    {regulation.number && (
                      <p className="text-sm text-blue-600 mb-2">Regulation {regulation.number} of {regulation.year}</p>
                    )}
                    <p className="text-gray-600 mb-3 line-clamp-2">{regulation.summary}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(regulation.effectiveDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{regulation.issuingBody}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        regulation.status === 'Current' 
                          ? 'bg-green-100 text-green-800'
                          : regulation.status === 'Superseded'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {regulation.status}
                      </span>
                      {regulation.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {regulation.category}
                        </span>
                      )}
                      {regulation.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Eye className="h-5 w-5 text-gray-400" />
                    {regulation.source_url && (
                      <a
                        href={regulation.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-3">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={showDocumentPreview}
        onClose={() => {
          setShowDocumentPreview(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

    </div>
  );
} 