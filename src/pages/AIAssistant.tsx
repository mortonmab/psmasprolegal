import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, Link, MessageSquare, FileText, AlertCircle } from 'lucide-react';
import { chatPdfService } from '../services/chatPdfService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: { pageNumber: number }[];
}

interface Conversation {
  id: string;
  sourceId: string;
  fileName: string;
  pdfUrl?: string;
  messages: Message[];
  createdAt: Date;
}

export default function AIAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Create a URL for the PDF preview
      const fileUrl = URL.createObjectURL(file);
      
      const sourceId = await chatPdfService.uploadFile(file);
      
      const newConversation: Conversation = {
        id: Date.now().toString(),
        sourceId,
        fileName: file.name,
        pdfUrl: fileUrl,
        messages: [{
          role: 'assistant',
          content: `PDF "${file.name}" uploaded successfully! You can now ask questions about it.`,
          timestamp: new Date()
        }],
        createdAt: new Date()
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!pdfUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const sourceId = await chatPdfService.addSourceFromUrl(pdfUrl);
      
      const newConversation: Conversation = {
        id: Date.now().toString(),
        sourceId,
        fileName: `PDF from URL`,
        pdfUrl: pdfUrl,
        messages: [{
          role: 'assistant',
          content: `PDF from URL uploaded successfully! You can now ask questions about it.`,
          timestamp: new Date()
        }],
        createdAt: new Date()
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setPdfUrl('');
    } catch (error) {
      console.error('Error uploading from URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload from URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const updatedMessages = [...currentConversation.messages, userMessage];
    
    setCurrentConversation(prev => prev ? {
      ...prev,
      messages: updatedMessages
    } : null);
    
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatPdfService.sendMessage(
        currentConversation.sourceId,
        updatedMessages,
        true
      );
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        references: response.references
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: finalMessages
      } : null);

      // Update conversations list
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversation.id 
          ? { ...conv, messages: finalMessages }
          : conv
      ));
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to get response');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: finalMessages
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversation: Conversation) => {
    try {
      await chatPdfService.deleteSource(conversation.sourceId);
      
      if (conversation.pdfUrl && conversation.pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(conversation.pdfUrl);
      }
      
      setConversations(prev => prev.filter(conv => conv.id !== conversation.id));
      
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    }
  };

  const resetChat = () => {
    if (currentConversation?.pdfUrl && currentConversation.pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentConversation.pdfUrl);
    }
    setCurrentConversation(null);
    setError(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg mb-4">AI Assistant</h2>
          
          {/* Upload Tabs */}
          <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setUploadMethod('file')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                uploadMethod === 'file' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-1" />
              File
            </button>
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                uploadMethod === 'url' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Link className="h-4 w-4 inline mr-1" />
              URL
            </button>
          </div>

          {/* Upload Section */}
          {uploadMethod === 'file' ? (
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="url"
                value={pdfUrl || ''}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="Enter PDF URL..."
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleUrlUpload}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !pdfUrl.trim()}
              >
                <Link className="h-4 w-4 mr-2" />
                Load PDF
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Recent Conversations</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No conversations yet. Upload a PDF to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => setCurrentConversation(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.fileName}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {conversation.messages.length - 1} messages
                        </p>
                        <p className="text-xs text-gray-400">
                          {conversation.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation);
                        }}
                        className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete conversation"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="font-semibold text-lg truncate">{currentConversation.fileName}</h2>
              </div>
              <button
                onClick={resetChat}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Close conversation"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.references && message.references.length > 0 && (
                      <p className="text-xs mt-2 opacity-70">
                        References: Pages {message.references.map(ref => ref.pageNumber).join(', ')}
                      </p>
                    )}
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your PDF..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the sidebar or upload a new PDF to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 