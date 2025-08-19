import axios from 'axios';

export interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  type: 'case-law' | 'legislation' | 'regulation' | 'gazette';
  enabled: boolean;
  selectors: {
    title: string;
    content: string;
    date?: string;
    reference?: string;
  };
}

class ScrapingService {
  private sources: ScrapingSource[] = [
    {
      id: 'saflii',
      name: 'Southern African Legal Information Institute',
      url: 'http://www.saflii.org',
      type: 'case-law',
      enabled: true,
      selectors: {
        title: '.judgment-title',
        content: '.judgment-body',
        date: '.judgment-date',
        reference: '.judgment-reference'
      }
    },
    {
      id: 'gov-legislation',
      name: 'Government Legislation Portal',
      url: 'https://www.gov.za/documents/acts',
      type: 'legislation',
      enabled: true,
      selectors: {
        title: '.legislation-title',
        content: '.legislation-content',
        date: '.publication-date'
      }
    },
    {
      id: 'gov-regulations',
      name: 'Government Regulations',
      url: 'https://www.gov.za/documents/regulations',
      type: 'regulation',
      enabled: true,
      selectors: {
        title: '.regulation-title',
        content: '.regulation-content',
        date: '.publication-date'
      }
    },
    {
      id: 'gov-gazette',
      name: 'Government Gazette',
      url: 'https://www.gov.za/documents/government-gazette',
      type: 'gazette',
      enabled: true,
      selectors: {
        title: '.gazette-title',
        content: '.gazette-content',
        date: '.gazette-date',
        reference: '.gazette-number'
      }
    }
  ];

  private readonly API_URL = import.meta.env.DEV 
    ? 'http://localhost:3000/api'
    : 'https://your-production-api-url.com/api';

  async scrapeContent(sourceId: string, searchParams?: Record<string, string>) {
    try {
      const source = this.sources.find(s => s.id === sourceId);
      if (!source || !source.enabled) {
        throw new Error('Invalid or disabled source');
      }

      console.log('Checking backend health...');
      const healthCheck = await this.checkBackendHealth();
      if (!healthCheck) {
        throw new Error('Backend service is not available');
      }

      console.log('Making scrape request...');
      const response = await axios.post(`${this.API_URL}/scrape`, {
        source,
        searchParams
      }, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Scrape response:', response.status, response.data);
      
      if (response.status === 202) {
        return {
          status: 'queued',
          jobId: response.data.jobId
        };
      }

      return response.data;
    } catch (error) {
      console.error('Scraping error:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to scraping service. Please ensure the backend is running.');
        }
        if (error.response) {
          throw new Error(`Scraping failed: ${error.response.data.message || 'Unknown error'}`);
        }
      }
      throw new Error('Failed to initiate scraping process');
    }
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.API_URL}/health`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Health check response:', response.status, response.data);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getScrapingStatus(jobId: string) {
    try {
      const response = await axios.get(`${this.API_URL}/scrape/status/${jobId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get scraping status');
    }
  }

  getSources(type?: string) {
    return type 
      ? this.sources.filter(s => s.type === type)
      : this.sources;
  }

  updateSource(sourceId: string, updates: Partial<ScrapingSource>) {
    const index = this.sources.findIndex(s => s.id === sourceId);
    if (index >= 0) {
      this.sources[index] = { ...this.sources[index], ...updates };
    }
  }

  addSource(source: ScrapingSource) {
    this.sources.push(source);
  }

  deleteSource(sourceId: string) {
    this.sources = this.sources.filter(s => s.id !== sourceId);
  }
}

export const scrapingService = new ScrapingService(); 