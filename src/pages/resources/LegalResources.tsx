import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { scrapingService, ScrapedData } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';
import { ManualUploadModal } from '../../components/ManualUploadModal';

interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'legislation' | 'regulation' | 'gazette';
  description: string;
  link: string;
  date: string;
  tags: string[];
  source_url?: string;
}

// Add new interface for crawl status
interface CrawlStatus {
  type: 'case-law' | 'legislation' | 'regulation' | 'gazette';
  status: 'idle' | 'crawling' | 'completed' | 'error';
  progress?: number;
  lastUpdated?: Date;
}

export function LegalResources() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<Record<string, CrawlStatus>>({
    'case-law': { type: 'case-law', status: 'idle' },
    'legislation': { type: 'legislation', status: 'idle' },
    'regulation': { type: 'regulation', status: 'idle' },
    'gazette': { type: 'gazette', status: 'idle' }
  });
  const { toast } = useToast();

  // Search scraped data when query changes
  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await scrapingService.getScrapedData({
          search: searchQuery,
          limit: 10
        });

        if (response) {
          const results: SearchResult[] = response.data.map((item: ScrapedData) => ({
            id: item.id,
            title: item.title,
            type: mapSourceTypeToResultType(item.source_type),
            description: item.content.substring(0, 200) + '...',
            link: `/resources/${mapSourceTypeToRoute(item.source_type)}`,
            date: item.date_published || item.scraped_at,
            tags: item.keywords ? item.keywords.split(',').map(k => k.trim()) : [],
            source_url: item.source_url
          }));
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Error searching scraped data:', error);
        toast({
          title: "Search Error",
          description: "Failed to search legal resources",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, toast]);

  const mapSourceTypeToResultType = (sourceType: string): 'case' | 'legislation' | 'regulation' | 'gazette' => {
    switch (sourceType) {
      case 'case_law':
        return 'case';
      case 'legislation':
        return 'legislation';
      case 'regulation':
        return 'regulation';
      case 'gazette':
        return 'gazette';
      default:
        return 'case';
    }
  };

  const mapSourceTypeToRoute = (sourceType: string): string => {
    switch (sourceType) {
      case 'case_law':
        return 'case-law';
      case 'legislation':
        return 'legislation';
      case 'regulation':
        return 'regulations';
      case 'gazette':
        return 'gazettes';
      default:
        return 'case-law';
    }
  };

  const filteredResults = searchResults;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'case':
        return 'bg-blue-100 text-blue-800';
      case 'legislation':
        return 'bg-green-100 text-green-800';
      case 'regulation':
        return 'bg-purple-100 text-purple-800';
      case 'gazette':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'case':
        return 'Case Law';
      case 'legislation':
        return 'Legislation';
      case 'regulation':
        return 'Regulation';
      case 'gazette':
        return 'Gazette';
      default:
        return type;
    }
  };

  const initiateWebCrawl = async (type: 'case-law' | 'legislation' | 'regulation' | 'gazette') => {
    try {
      setCrawlStatus(prev => ({
        ...(prev || {}),
        [type]: { type, status: 'crawling', progress: 0 }
      }));

      const sources = await scrapingService.getSources(type);
      
      console.log('Fetched sources for', type, ':', sources);
      
      if (sources.length === 0) {
        toast({
          title: "No sources configured",
          description: `Please configure sources for ${type} in settings first.`,
          variant: "destructive"
        });
        return;
      }

      // Start crawling with progress tracking
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        console.log('Processing source:', source);
        
        if (!source.enabled) {
          console.log('Source disabled, skipping:', source.name);
          continue;
        }

        if (!source.id) {
          console.error('Source missing ID:', source);
          toast({
            title: "Source Error",
            description: `Source ${source.name} is missing ID. Please check configuration.`,
            variant: "destructive"
          });
          continue;
        }

        try {
          console.log('Scraping source with ID:', source.id);
          const result = await scrapingService.scrapeContent(source.id);
          
          if (result.status === 'queued') {
            // Poll for status
            let complete = false;
            while (!complete) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
              const status = await scrapingService.getScrapingStatus(result.jobId);
              
              if (status.status === 'completed') {
                complete = true;
              } else if (status.status === 'failed') {
                throw new Error(status.error);
              }
              
              // Update progress
              setCrawlStatus(prev => ({
                ...(prev || {}),
                [type]: {
                  ...(prev?.[type] || { type, status: 'crawling' }),
                  progress: status.progress || ((i + 1) / sources.length) * 100
                }
              }));
            }
          }
        } catch (sourceError) {
          console.error(`Failed to scrape source ${source.name}:`, sourceError);
          toast({
            title: "Source Error",
            description: `Failed to scrape ${source.name}. Continuing with remaining sources.`,
            variant: "destructive"
          });
        }
      }

      // Update status to completed
      setCrawlStatus(prev => ({
        ...(prev || {}),
        [type]: { 
          type, 
          status: 'completed', 
          lastUpdated: new Date() 
        }
      }));

      toast({
        title: "Crawl Completed",
        description: `Successfully updated ${type} database.`
      });

    } catch (error) {
      console.error(`Crawl failed for ${type}:`, error);
      setCrawlStatus(prev => ({
        ...(prev || {}),
        [type]: { type, status: 'error' }
      }));

      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : 'Failed to update database. Please try again.',
        variant: "destructive"
      });
    }
  };

  // Helper to render crawl status
  const renderCrawlStatus = (type: 'case-law' | 'legislation' | 'regulation' | 'gazette') => {
    const status = crawlStatus[type];

    if (status.status === 'crawling') {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{Math.round(status.progress || 0)}%</span>
        </div>
      );
    }

    if (status.status === 'completed') {
      return (
        <div className="text-xs text-gray-500">
          Last updated: {status.lastUpdated?.toLocaleString()}
        </div>
      );
    }

    if (status.status === 'error') {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>Failed</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative h-[450px] rounded-xl overflow-hidden">
        <img 
          src="/images/main.jpg"
          alt="Legal Resources"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative h-full flex flex-col justify-center px-8 bg-black/30">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="text-amber-400">Search</span> Legal Resources
          </h1>
          <p className="text-gray-100 mb-8">
            You can search the web for Cases, Legislation, regulations and government gazettes here.
          </p>
          <div className="max-w-2xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Search across all legal resources..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchQuery && (
              <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : filteredResults.length > 0 ? (
                  <div className="py-2">
                    {filteredResults.map((result) => (
                      <div key={result.id} className="px-4 py-2 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{result.title}</h3>
                            <p className="text-sm text-gray-500">{result.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {result.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <span>{result.date}</span>
                              {result.source_url && (
                                <a
                                  href={result.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 hover:text-blue-600"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View Source</span>
                                </a>
                              )}
                            </div>
                          </div>
                          <span className={`ml-4 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Legal Resources</h2>
            <p className="text-gray-600">Manually upload case law, legislation, regulations, or gazettes</p>
          </div>
          <ManualUploadModal onUploadSuccess={() => {
            // Refresh search results if there's an active search
            if (searchQuery.trim()) {
              // Trigger a new search to include the uploaded content
              const event = new Event('input', { bubbles: true });
              const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              if (searchInput) {
                searchInput.dispatchEvent(event);
              }
            }
          }} />
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cases Card */}
        <div className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200">
          <div className="h-48 overflow-hidden">
            <img 
              src="/images/cases2.jpeg"
              alt="Cases and Judgements"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Cases and Judgements</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search and browse through case law and judgments.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link 
                to="/resources/case-law"
                className="text-amber-600 hover:text-amber-700"
              >
                View Cases →
              </Link>
              <button
                onClick={() => initiateWebCrawl('case-law')}
                disabled={crawlStatus['case-law'].status === 'crawling'}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Update Database
              </button>
            </div>
            {renderCrawlStatus('case-law')}
          </div>
        </div>

        {/* Legislation Card */}
        <div className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200">
          <div className="h-48 overflow-hidden">
            <img 
              src="/images/legiss.jpeg"
              alt="Legislation"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Legislation</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search and browse through legislation.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link 
                to="/resources/legislation"
                className="text-amber-600 hover:text-amber-700"
              >
                View Legislation →
              </Link>
              <button
                onClick={() => initiateWebCrawl('legislation')}
                disabled={crawlStatus['legislation'].status === 'crawling'}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Update Database
              </button>
            </div>
            {renderCrawlStatus('legislation')}
          </div>
        </div>

        {/* Regulations Card */}
        <div className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200">
          <div className="h-48 overflow-hidden">
            <img 
              src="/images/cases2.jpeg"
              alt="Regulations"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Regulations</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search and browse through regulations.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link 
                to="/resources/regulations"
                className="text-amber-600 hover:text-amber-700"
              >
                View Regulations →
              </Link>
              <button
                onClick={() => initiateWebCrawl('regulation')}
                disabled={crawlStatus['regulation'].status === 'crawling'}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Update Database
              </button>
            </div>
            {renderCrawlStatus('regulation')}
          </div>
        </div>

        {/* Gazettes Card */}
        <div className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200">
          <div className="h-48 overflow-hidden">
            <img 
              src="/images/gazete.jpeg"
              alt="Gazettes"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">Gazettes</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search and browse through government gazettes.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link 
                to="/resources/gazettes"
                className="text-amber-600 hover:text-amber-700"
              >
                View Gazettes →
              </Link>
              <button
                onClick={() => initiateWebCrawl('gazette')}
                disabled={crawlStatus['gazette'].status === 'crawling'}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Update Database
              </button>
            </div>
            {renderCrawlStatus('gazette')}
          </div>
        </div>
      </div>
    </div>
  );
} 