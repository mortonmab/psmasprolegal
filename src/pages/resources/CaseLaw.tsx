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
  FileText,
  ExternalLink,
  Upload
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { scrapingService, ScrapedData } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';
import { ManualUploadModal } from '../../components/ManualUploadModal';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';

interface Case {
  id: string;
  title: string;
  citation?: string;
  court?: string;
  date: string;
  summary: string;
  fullContent: string;
  source_url?: string;
  judge?: string;
  category?: string;
  tags: string[];
  parties?: {
    plaintiff?: string;
    defendant?: string;
  };
}

export function CaseLaw() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<string>('All Courts');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  const courts = [
    'All Courts',
    'Constitutional Court',
    'Supreme Court',
    'Commercial Court',
    'High Court',
    'Unknown Court'
  ];

  const categories = [
    'All Categories',
    'Criminal Law',
    'Civil Law',
    'Commercial Law',
    'Constitutional Law',
    'Administrative Law',
    'General Law'
  ];

  // Fetch cases from API
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const response = await scrapingService.getScrapedData({
        source_type: 'case_law',
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: 'date_published',
        sort_order: sortDirection
      });

      if (response) {
        const mappedCases: Case[] = response.data.map((item: ScrapedData) => ({
          id: item.id,
          title: item.title,
          citation: item.reference_number,
          court: extractCourtFromContent(item.content),
          date: item.date_published || item.scraped_at,
          summary: item.content.substring(0, 300) + '...',
          fullContent: item.content, // Store full content
          source_url: item.source_url,
          judge: extractJudgeFromContent(item.content),
          category: determineCategory(item.content),
          tags: item.keywords ? item.keywords.split(',').map(k => k.trim()) : [],
          parties: extractPartiesFromContent(item.content)
        }));

        setCases(mappedCases);
        setTotalCases(response.pagination.total);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to extract information from content
  const extractCourtFromContent = (content: string): string => {
    const courtPatterns = [
      /constitutional court/i,
      /supreme court/i,
      /commercial court/i,
      /high court/i
    ];
    
    for (const pattern of courtPatterns) {
      if (pattern.test(content)) {
        return content.match(pattern)?.[0] || 'Unknown Court';
      }
    }
    return 'Unknown Court';
  };

  const extractJudgeFromContent = (content: string): string => {
    const judgeMatch = content.match(/(?:judge|justice|hon\.)\s+([a-zA-Z\s]+)/i);
    return judgeMatch ? judgeMatch[1].trim() : 'Unknown Judge';
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

  const extractPartiesFromContent = (content: string) => {
    const plaintiffMatch = content.match(/(?:plaintiff|applicant):\s*([a-zA-Z\s&]+)/i);
    const defendantMatch = content.match(/(?:defendant|respondent):\s*([a-zA-Z\s&]+)/i);
    
    return {
      plaintiff: plaintiffMatch ? plaintiffMatch[1].trim() : undefined,
      defendant: defendantMatch ? defendantMatch[1].trim() : undefined
    };
  };

  // Fetch cases when dependencies change
  useEffect(() => {
    fetchCases();
  }, [currentPage, searchQuery, sortDirection, itemsPerPage]);

  // Enhanced filtering logic
  const filteredCases = cases.filter(c => {
    const matchesCourt = selectedCourt === 'All Courts' || c.court === selectedCourt;
    const matchesCategory = selectedCategory === 'All Categories' || c.category === selectedCategory;
    const matchesSearch = searchQuery === '' || c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.citation && c.citation.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCourt && matchesCategory && matchesSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCases();
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCaseClick = (caseItem: Case) => {
    setSelectedDocument({
      id: caseItem.id,
      title: caseItem.title,
      content: caseItem.fullContent,
      date: caseItem.date,
      source_url: caseItem.source_url,
      tags: caseItem.tags,
      type: 'Case Law',
      category: caseItem.category,
      jurisdiction: 'Zimbabwe',
      citation: caseItem.citation,
      court: caseItem.court,
      judge: caseItem.judge,
      parties: caseItem.parties
    });
    setShowDocumentPreview(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedCase(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Law</h1>
          <p className="text-gray-600">Search and browse through case law and judgments</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalCases} cases found
          </span>
          <ManualUploadModal 
            onUploadSuccess={() => {
              // Refresh the cases list
              fetchCases();
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
                  placeholder="Search cases by title, citation, or content..."
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
            {/* Court Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Court:</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {courts.map(court => (
                  <option key={court} value={court}>{court}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
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

      {/* Cases List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading cases...</div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCases.map((caseItem) => (
              <div key={caseItem.id} className="p-6 hover:bg-gray-50 cursor-pointer" onClick={() => handleCaseClick(caseItem)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                    {caseItem.citation && (
                      <p className="text-sm text-blue-600 mb-2">{caseItem.citation}</p>
                    )}
                    <p className="text-gray-600 mb-3 line-clamp-2">{caseItem.summary}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(caseItem.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{caseItem.court}</span>
                      </div>
                      {caseItem.judge && (
                        <div className="flex items-center space-x-1">
                          <span>Judge: {caseItem.judge}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {caseItem.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {caseItem.category}
                        </span>
                      )}
                      {caseItem.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Eye className="h-5 w-5 text-gray-400" />
                    {caseItem.source_url && (
                      <a
                        href={caseItem.source_url}
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