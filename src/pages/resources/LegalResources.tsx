import React, { useState } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { scrapingService } from '../../services/scrapingService';
import { useToast } from '../../components/ui/use-toast';

interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'legislation' | 'regulation' | 'gazette';
  description: string;
  link: string;
  date: string;
  tags: string[];
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
  const [crawlStatus, setCrawlStatus] = useState<Record<string, CrawlStatus>>({
    'case-law': { type: 'case-law', status: 'idle' },
    'legislation': { type: 'legislation', status: 'idle' },
    'regulation': { type: 'regulation', status: 'idle' },
    'gazette': { type: 'gazette', status: 'idle' }
  });
  const { addToast } = useToast();

  // Mock data for search results
  const searchResults: SearchResult[] = [
    {
      id: 'case-1',
      title: 'Smith v. Johnson',
      type: 'case',
      description: 'Case regarding corporate liability...',
      link: '/resources/case-law',
      date: '2024-01-15',
      tags: ['Corporate Law', 'Liability']
    },
    {
      id: 'leg-1',
      title: 'Companies Act',
      type: 'legislation',
      description: 'Act 71 of 2008',
      link: '/resources/legislation',
      date: '2008',
      tags: ['Corporate Law', 'Companies']
    },
    {
      id: 'reg-1',
      title: 'Companies Regulations',
      type: 'regulation',
      description: 'Regulations under Companies Act',
      link: '/resources/regulations',
      date: '2009',
      tags: ['Corporate Law', 'Compliance']
    },
    {
      id: 'gaz-1',
      title: 'Government Gazette 45196',
      type: 'gazette',
      description: 'Contains various notices...',
      link: '/resources/gazettes',
      date: '2024-01-15',
      tags: ['Notices', 'Regulations']
    }
  ];

  const filteredResults = searchQuery
    ? searchResults.filter(result =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

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
        ...prev,
        [type]: { type, status: 'crawling', progress: 0 }
      }));

      const sources = scrapingService.getSources(type);
      
      if (sources.length === 0) {
        addToast({
          title: "No sources configured",
          description: `Please configure sources for ${type} in settings first.`,
          variant: "destructive"
        });
        return;
      }

      // Start crawling with progress tracking
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (!source.enabled) continue;

        try {
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
                ...prev,
                [type]: {
                  ...prev[type],
                  progress: status.progress || ((i + 1) / sources.length) * 100
                }
              }));
            }
          }
        } catch (sourceError) {
          console.error(`Failed to scrape source ${source.name}:`, sourceError);
          addToast({
            title: "Source Error",
            description: `Failed to scrape ${source.name}. Continuing with remaining sources.`,
            variant: "destructive"
          });
        }
      }

      // Update status to completed
      setCrawlStatus(prev => ({
        ...prev,
        [type]: { 
          type, 
          status: 'completed', 
          lastUpdated: new Date() 
        }
      }));

      addToast({
        title: "Crawl Completed",
        description: `Successfully updated ${type} database.`
      });

    } catch (error) {
      console.error(`Crawl failed for ${type}:`, error);
      setCrawlStatus(prev => ({
        ...prev,
        [type]: { type, status: 'error' }
      }));

      addToast({
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
                {filteredResults.length > 0 ? (
                  <div className="py-2">
                    {filteredResults.map((result) => (
                      <Link
                        key={result.id}
                        to={result.link}
                        className="block px-4 py-2 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
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
                          </div>
                          <span className={`ml-4 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                      </Link>
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