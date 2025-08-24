import React, { useState, useEffect } from 'react';
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
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Calendar,
  Tag,
  Upload
} from 'lucide-react';
import { scrapingService, ScrapedData } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';
import { ManualUploadModal } from '../../components/ManualUploadModal';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';

interface Legislation {
  id: string;
  title: string;
  number: string;
  year: string;
  type: 'Act' | 'Bill' | 'Amendment';
  status: 'In Force' | 'Repealed' | 'Amended' | 'Draft';
  category: string;
  summary: string;
  fullContent: string;
  source_url?: string;
  effectiveDate: string;
  lastAmended?: string;
  tags: string[];
}

export function Legislation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLegislation, setSelectedLegislation] = useState<Legislation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [legislations, setLegislations] = useState<Legislation[]>([]);
  const [totalLegislations, setTotalLegislations] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  const types = [
    'All Types',
    'Act',
    'Bill',
    'Amendment'
  ];

  const statuses = [
    'All Statuses',
    'In Force',
    'Repealed',
    'Amended',
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

  // Fetch legislation from API
  const fetchLegislation = async () => {
    setIsLoading(true);
    try {
      const response = await scrapingService.getScrapedData({
        source_type: 'legislation',
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: 'date_published',
        sort_order: sortDirection
      });

      if (response) {
        const mappedLegislation: Legislation[] = response.data.map((item: ScrapedData) => ({
          id: item.id,
          title: item.title,
          number: extractNumberFromTitle(item.title),
          year: extractYearFromContent(item.content),
          type: determineType(item.title, item.content),
          status: determineStatus(item.content),
          category: determineCategory(item.content),
          fullContent: item.content,
          summary: item.content.substring(0, 300) + '...',
          source_url: item.source_url,
          effectiveDate: item.date_published || item.scraped_at,
          lastAmended: extractLastAmended(item.content),
          tags: item.keywords ? item.keywords.split(',').map(k => k.trim()) : []
        }));

        setLegislations(mappedLegislation);
        setTotalLegislations(response.pagination.total);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching legislation:', error);
      toast({
        title: "Error",
        description: "Failed to fetch legislation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to extract information from content
  const extractNumberFromTitle = (title: string): string => {
    const numberMatch = title.match(/(?:Act|Bill|Amendment)\s+(\d+)/i);
    return numberMatch ? numberMatch[1] : 'N/A';
  };

  const extractYearFromContent = (content: string): string => {
    const yearMatch = content.match(/(?:19|20)\d{2}/);
    return yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  };

  const determineType = (title: string, content: string): 'Act' | 'Bill' | 'Amendment' => {
    if (/bill/i.test(title) || /bill/i.test(content)) return 'Bill';
    if (/amendment/i.test(title) || /amendment/i.test(content)) return 'Amendment';
    return 'Act';
  };

  const determineStatus = (content: string): 'In Force' | 'Repealed' | 'Amended' | 'Draft' => {
    if (/repealed/i.test(content)) return 'Repealed';
    if (/amended/i.test(content)) return 'Amended';
    if (/draft/i.test(content)) return 'Draft';
    return 'In Force';
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

  const extractLastAmended = (content: string): string | undefined => {
    const amendedMatch = content.match(/(?:amended|updated|revised).*?(?:19|20)\d{2}/i);
    return amendedMatch ? amendedMatch[0] : undefined;
  };

  // Fetch legislation when dependencies change
  useEffect(() => {
    fetchLegislation();
  }, [currentPage, searchQuery, sortDirection]);

  // Enhanced filtering logic
  const filteredLegislation = legislations.filter(l => {
    const matchesType = selectedType === 'All Types' || l.type === selectedType;
    const matchesStatus = selectedStatus === 'All Statuses' || l.status === selectedStatus;
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (l.number && l.number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLegislation();
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLegislationClick = (legislation: Legislation) => {
    setSelectedDocument({
      id: legislation.id,
      title: legislation.title,
      content: legislation.fullContent,
      date: legislation.effectiveDate,
      source_url: legislation.source_url,
      tags: legislation.tags,
      type: 'Legislation',
      category: legislation.category,
      jurisdiction: 'Zimbabwe'
    });
    setShowDocumentPreview(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedLegislation(null);
  };

  const handleCitationCopy = (citation: string) => {
    navigator.clipboard.writeText(citation);
    toast({
      title: "Success",
      description: "Citation copied to clipboard"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legislation</h1>
          <p className="text-gray-600">Search and browse through legislation, acts, and bills</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalLegislations} items found
          </span>
          <ManualUploadModal 
            onUploadSuccess={() => {
              // Refresh the legislation list
              fetchLegislation();
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
                  placeholder="Search legislation by title, number, or content..."
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
            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
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

      {/* Legislation List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading legislation...</div>
          </div>
        ) : filteredLegislation.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No legislation found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLegislation.map((legislation) => (
              <div key={legislation.id} className="p-6 hover:bg-gray-50 cursor-pointer" onClick={() => handleLegislationClick(legislation)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{legislation.title}</h3>
                    {legislation.number && (
                      <p className="text-sm text-blue-600 mb-2">{legislation.number} of {legislation.year}</p>
                    )}
                    <p className="text-gray-600 mb-3 line-clamp-2">{legislation.summary}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(legislation.effectiveDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{legislation.type}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        legislation.status === 'In Force' 
                          ? 'bg-green-100 text-green-800'
                          : legislation.status === 'Repealed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {legislation.status}
                      </span>
                      {legislation.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {legislation.category}
                        </span>
                      )}
                      {legislation.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Eye className="h-5 w-5 text-gray-400" />
                    {legislation.source_url && (
                      <a
                        href={legislation.source_url}
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