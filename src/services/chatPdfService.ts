interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  references?: { pageNumber: number }[];
}

class ChatPDFService {
  private readonly BASE_URL = '/api/chatpdf';

  async addSourceFromUrl(url: string): Promise<string> {
    try {
      const response = await fetch(`${this.BASE_URL}/add-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.sourceId;
    } catch (error) {
      console.error('Error adding source from URL:', error);
      throw error;
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.BASE_URL}/add-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.sourceId;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async sendMessage(
    sourceId: string, 
    messages: ChatMessage[], 
    referenceSources = true,
    stream = false
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          sourceId,
          messages,
          referenceSources,
          stream
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        content: data.content || 'No response content',
        references: data.references || []
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async deleteSource(sourceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/sources`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ sources: [sourceId] }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      throw error;
    }
  }

  async deleteMultipleSources(sourceIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/sources`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ sources: sourceIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting sources:', error);
      throw error;
    }
  }
}

export const chatPdfService = new ChatPDFService(); 