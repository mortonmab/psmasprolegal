import React, { useState, useEffect } from 'react';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Eye,
  FileText,
  MapPin, 
  Calendar, 
  Bookmark,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { scrapingService, ScrapedData } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';
import { ManualUploadModal } from '../../components/ManualUploadModal';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';

interface Gazette {
  id: string;
  title: string;
  gazetteNumber: string;
  date: string;
  type: 'Government' | 'Provincial' | 'Legal Notices' | 'Regulation';
  jurisdiction: string;
  category: string;
  summary: string;
  fullContent: string;
  source_url?: string;
  notices: {
    type: string;
    description: string;
  }[];
  tags: string[];
}

export function Gazettes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedYear, setSelectedYear] = useState<string>('All Years');
  const [selectedMonth, setSelectedMonth] = useState<string>('All Months');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedGazette, setSelectedGazette] = useState<Gazette | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [gazettes, setGazettes] = useState<Gazette[]>([]);
  const [totalGazettes, setTotalGazettes] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [subscribedNotices, setSubscribedNotices] = useState<string[]>([]);
  const [bookmarkedGazettes, setBookmarkedGazettes] = useState<string[]>([]);
  const { toast } = useToast();

  const gazetteTypes = [
    'All Types',
    'Government',
    'Provincial',
    'Legal Notices',
    'Regulation'
  ];

  const years = [
    'All Years',
    '2025',
    '2024',
    '2023',
    '2022',
    '2021',
    '2020',
    '2019',
    '2018',
    '2017',
    '2016',
    '2015'
  ];

  const months = [
    'All Months',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const categories = [
    'All Categories',
    'General Notices',
    'Proclamations',
    'Regulations',
    'Appointments',
    'Tenders',
    'Public Comments'
  ];

  // Fetch gazettes from API
  const fetchGazettes = async () => {
    setIsLoading(true);
    try {
      const response = await scrapingService.getScrapedData({
        source_type: 'gazette',
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: 'date_published',
        sort_order: sortDirection
      });

      if (response) {
        const mappedGazettes: Gazette[] = response.data.map((item: ScrapedData) => ({
          id: item.id,
          title: item.title,
          gazetteNumber: extractGazetteNumber(item.title, item.content),
          date: item.date_published || item.scraped_at,
          type: determineType(item.title, item.content),
          jurisdiction: extractJurisdiction(item.content),
          category: determineCategory(item.content),
          summary: item.content.substring(0, 300) + '...',
          fullContent: item.content,
          source_url: item.source_url,
          notices: extractNotices(item.content),
          tags: item.keywords ? item.keywords.split(',').map(k => k.trim()) : []
        }));

        setGazettes(mappedGazettes);
        setTotalGazettes(response.pagination.total);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching gazettes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch gazettes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to extract information from content
  const extractGazetteNumber = (title: string, content: string): string => {
    const numberMatch = title.match(/(?:Gazette|No\.?)\s*(\d+)/i) || content.match(/(?:Gazette|No\.?)\s*(\d+)/i);
    return numberMatch ? numberMatch[1] : 'N/A';
  };

  const determineType = (title: string, content: string): 'Government' | 'Provincial' | 'Legal Notices' | 'Regulation' => {
    if (/provincial/i.test(title) || /provincial/i.test(content)) return 'Provincial';
    if (/legal notice/i.test(title) || /legal notice/i.test(content)) return 'Legal Notices';
    if (/regulation/i.test(title) || /regulation/i.test(content)) return 'Regulation';
    return 'Government';
  };

  const extractJurisdiction = (content: string): string => {
    // For Zimbabwe gazettes, we'll use the jurisdiction from the database or default to Zimbabwe
    return 'Zimbabwe';
  };

  const determineCategory = (content: string): string => {
    const categoryPatterns = [
      { pattern: /proclamation/i, category: 'Proclamations' },
      { pattern: /regulation/i, category: 'Regulations' },
      { pattern: /appointment/i, category: 'Appointments' },
      { pattern: /tender/i, category: 'Tenders' },
      { pattern: /public comment/i, category: 'Public Comments' }
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(content)) {
        return category;
      }
    }
    return 'General Notices';
  };

  const extractNotices = (content: string) => {
    const notices = [];
    const noticePatterns = [
      /(?:proclamation|notice|appointment|tender):\s*([^\.]+)/gi
    ];
    
    for (const pattern of noticePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        notices.push({
          type: match[0].split(':')[0].trim(),
          description: match[1].trim()
        });
      }
    }
    
    return notices.slice(0, 3); // Limit to 3 notices
  };

  // Fetch gazettes when dependencies change
  useEffect(() => {
    fetchGazettes();
  }, [currentPage, searchQuery, sortDirection, itemsPerPage]);

  // Enhanced filtering logic
  const filteredGazettes = gazettes.filter(g => {
    const matchesType = selectedType === 'All Types' || g.type === selectedType;
    
    // Filter by year
    const gazetteYear = new Date(g.date).getFullYear().toString();
    const matchesYear = selectedYear === 'All Years' || gazetteYear === selectedYear;
    
    // Filter by month
    const gazetteMonth = new Date(g.date).toLocaleString('en-US', { month: 'long' });
    const matchesMonth = selectedMonth === 'All Months' || gazetteMonth === selectedMonth;
    
    const matchesSearch = searchQuery === '' || g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (g.gazetteNumber && g.gazetteNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesYear && matchesMonth && matchesSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGazettes();
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleGazetteClick = (gazette: Gazette) => {
    setSelectedDocument({
      id: gazette.id,
      title: gazette.title,
      content: gazette.fullContent,
      date: gazette.date,
      source_url: gazette.source_url,
      tags: gazette.tags,
      type: 'Gazette',
      category: gazette.category,
      jurisdiction: gazette.jurisdiction,
      gazetteNumber: gazette.gazetteNumber
    });
    setShowDocumentPreview(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedGazette(null);
  };

  const handleSubscribe = (noticeType: string) => {
    setSubscribedNotices(prev => 
      prev.includes(noticeType) 
        ? prev.filter(t => t !== noticeType)
        : [...prev, noticeType]
    );
    toast({
      title: "Success",
      description: `Subscribed to ${noticeType} notices`
    });
  };

  const handleBookmark = (gazetteId: string) => {
    setBookmarkedGazettes(prev =>
      prev.includes(gazetteId)
        ? prev.filter(id => id !== gazetteId)
        : [...prev, gazetteId]
    );
    toast({
      title: "Success",
      description: "Gazette bookmarked"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zimbabwe Government Gazettes</h1>
          <p className="text-gray-600">Search and browse through Zimbabwe government gazettes and official notices</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalGazettes} gazettes found
          </span>
          <ManualUploadModal 
            onUploadSuccess={() => {
              // Refresh the gazettes list
              fetchGazettes();
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
                  placeholder="Search gazettes by title, number, or content..."
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
                {gazetteTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
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

      {/* Gazettes List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading gazettes...</div>
          </div>
        ) : filteredGazettes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No gazettes found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredGazettes.map((gazette) => (
              <div key={gazette.id} className="p-6 hover:bg-gray-50 cursor-pointer" onClick={() => handleGazetteClick(gazette)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{gazette.title}</h3>
                    {gazette.gazetteNumber && (
                      <p className="text-sm text-blue-600 mb-2">Gazette No. {gazette.gazetteNumber}</p>
                    )}
                    <p className="text-gray-600 mb-3 line-clamp-2">{gazette.summary}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(gazette.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{gazette.jurisdiction}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        gazette.type === 'Government' 
                          ? 'bg-blue-100 text-blue-800'
                          : gazette.type === 'Provincial'
                          ? 'bg-green-100 text-green-800'
                          : gazette.type === 'Legal Notices'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {gazette.type}
                      </span>
                      {gazette.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {gazette.category}
                        </span>
                      )}
                      {gazette.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(gazette.id);
                      }}
                      className={`p-1 rounded ${bookmarkedGazettes.includes(gazette.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                    >
                      <Bookmark className="h-5 w-5" />
                    </button>
                    <Eye className="h-5 w-5 text-gray-400" />
                    {gazette.source_url && (
                      <a
                        href={gazette.source_url}
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