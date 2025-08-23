import axios from 'axios';

export interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  type: 'case-law' | 'legislation' | 'regulation' | 'gazette';
  enabled: boolean;
  selectors: Record<string, string>;
}

export interface ScrapedData {
  id: string;
  source_id: string;
  title: string;
  content: string;
  url: string;
  date?: string;
  reference?: string;
  created_at: string;
}

export interface ScrapedDataStats {
  total: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

class ScrapingService {
  private API_URL = 'http://localhost:3000/api';

  // ===== SOURCE MANAGEMENT =====

  async getSources(type?: string): Promise<ScrapingSource[]> {
    try {
      const response = await axios.get(`${this.API_URL}/scraping-sources`);
      const sources = response.data;
      
      // Map database types to frontend types
      const reverseTypeMapping: Record<string, string> = {
        'case_law': 'case-law',
        'legislation': 'legislation',
        'regulation': 'regulation',
        'gazette': 'gazette'
      };
      
      // Transform database format to frontend format
      const transformedSources: ScrapingSource[] = sources.map((s: {
        id: string;
        name: string;
        url: string;
        source_type: string;
        is_active: boolean;
        selectors: string | object | null;
      }) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        type: reverseTypeMapping[s.source_type] as ScrapingSource['type'],
        enabled: s.is_active,
        selectors: s.selectors ? (typeof s.selectors === 'string' ? JSON.parse(s.selectors) : s.selectors) : {}
      }));
      
      if (type) {
        return transformedSources.filter((s: ScrapingSource) => s.type === type);
      }
      
      return transformedSources;
    } catch (error) {
      console.error('Error fetching sources:', error);
      return [];
    }
  }

  async getSource(id: string): Promise<ScrapingSource | null> {
    try {
      const response = await axios.get(`${this.API_URL}/scraping-sources/${id}`);
      const source = response.data;
      
      // Map database types to frontend types
      const reverseTypeMapping: Record<string, string> = {
        'case_law': 'case-law',
        'legislation': 'legislation',
        'regulation': 'regulation',
        'gazette': 'gazette'
      };
      
      // Transform database format to frontend format
      return {
        id: source.id,
        name: source.name,
        url: source.url,
        type: reverseTypeMapping[source.source_type] as ScrapingSource['type'],
        enabled: source.is_active,
        selectors: source.selectors ? (typeof source.selectors === 'string' ? JSON.parse(source.selectors) : source.selectors) : {}
      };
    } catch (error) {
      console.error('Error fetching source:', error);
      return null;
    }
  }

  async createSource(source: Omit<ScrapingSource, 'id'>): Promise<ScrapingSource | null> {
    try {
      // Map frontend types to database types
      const typeMapping: Record<string, string> = {
        'case-law': 'case_law',
        'legislation': 'legislation',
        'regulation': 'regulation',
        'gazette': 'gazette'
      };
      
      const response = await axios.post(`${this.API_URL}/scraping-sources`, {
        name: source.name,
        url: source.url,
        source_type: typeMapping[source.type] || source.type,
        selectors: source.selectors
      });
      return response.data;
    } catch (error) {
      console.error('Error creating source:', error);
      return null;
    }
  }

  async updateSource(id: string, updates: Partial<ScrapingSource>): Promise<ScrapingSource | null> {
    try {
      // Map frontend types to database types
      const typeMapping: Record<string, string> = {
        'case-law': 'case_law',
        'legislation': 'legislation',
        'regulation': 'regulation',
        'gazette': 'gazette'
      };
      
      // Only send defined values to avoid overwriting with undefined
      const updateData: {
        name?: string;
        url?: string;
        source_type?: string;
        is_active?: boolean;
        selectors?: object;
      } = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.type !== undefined) updateData.source_type = typeMapping[updates.type] || updates.type;
      if (updates.enabled !== undefined) updateData.is_active = updates.enabled;
      if (updates.selectors !== undefined) updateData.selectors = updates.selectors;

      const response = await axios.put(`${this.API_URL}/scraping-sources/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating source:', error);
      return null;
    }
  }

  async deleteSource(id: string): Promise<boolean> {
    try {
      await axios.delete(`${this.API_URL}/scraping-sources/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting source:', error);
      return false;
    }
  }

  // ===== SCRAPED DATA RETRIEVAL =====

  async getScrapedData(query?: string, filters?: Record<string, any>): Promise<ScrapedData[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${this.API_URL}/scraped-data?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching scraped data:', error);
      return [];
    }
  }

  async getScrapedDataById(id: string): Promise<ScrapedData | null> {
    try {
      const response = await axios.get(`${this.API_URL}/scraped-data/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching scraped data:', error);
      return null;
    }
  }

  async getScrapedDataStats(): Promise<ScrapedDataStats | null> {
    try {
      const response = await axios.get(`${this.API_URL}/scraped-data/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching scraped data stats:', error);
      return null;
    }
  }

  // ===== WEB SCRAPING OPERATIONS =====

  async scrapeContent(sourceId: string, searchParams?: Record<string, string>) {
    try {
      const source = await this.getSource(sourceId);
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
      console.error('Error getting scraping status:', error);
      throw new Error('Failed to get scraping status');
    }
  }
}

export const scrapingService = new ScrapingService(); 