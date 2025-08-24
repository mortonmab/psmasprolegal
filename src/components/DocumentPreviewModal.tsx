import React, { useMemo, useState } from 'react';
import { X, Download, ExternalLink, FileText, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    content: string;
    date?: string;
    source_url?: string;
    tags?: string[];
    type?: string;
    category?: string;
    jurisdiction?: string;
    gazetteNumber?: string;
    citation?: string;
    court?: string;
    judge?: string;
    parties?: {
      plaintiff?: string;
      defendant?: string;
    };
  } | null;
}

export function DocumentPreviewModal({ isOpen, onClose, document }: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fitWidth, setFitWidth] = useState<boolean>(false);

  if (!document) return null;

  // Normalize a potential file URL from the provided source_url
  const getNormalizedFileUrl = (): string | null => {
    if (!document.source_url) return null;
    const backendBaseUrl = (process.env.REACT_APP_API_URL as string) || 'http://localhost:3000';
    let fileUrl = document.source_url;
    // If it's a local path or already an uploads path, map to the served /uploads/<filename>
    if (fileUrl.includes('/Users/') || fileUrl.includes('uploads')) {
      const fileName = fileUrl.split('/').pop() || '';
      return `${backendBaseUrl}/uploads/${fileName}`;
    }
    return fileUrl;
  };

  const getUrlExtension = (url: string | null): string | null => {
    if (!url) return null;
    // Strip query/hash then get extension
    const base = url.split('#')[0].split('?')[0];
    const name = base.split('/').pop() || '';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return (ext || '').toLowerCase() || null;
  };

  const isPdf = (() => {
    const url = getNormalizedFileUrl();
    const ext = getUrlExtension(url);
    return ext === 'pdf';
  })();

  const appendPdfViewerParams = (url: string): string => {
    // If URL already has a hash, append with & otherwise use #
    const hasHash = url.includes('#');
    const baseParams = 'toolbar=0&navpanes=0&scrollbar=0';
    const zoomParam = fitWidth ? 'zoom=page-width' : `zoom=${zoomLevel}`;
    const params = `${baseParams}&${zoomParam}`;
    return hasHash ? `${url}&${params}` : `${url}#${params}`;
  };

  const handleDownload = async () => {
    const normalized = getNormalizedFileUrl();
    if (!normalized) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(normalized);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.title;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    const normalized = getNormalizedFileUrl();
    if (normalized) window.open(normalized, '_blank');
  };

  const renderPreview = () => {
    const fileUrl = getNormalizedFileUrl();
    const ext = getUrlExtension(fileUrl);

    // For PDF files
    if (ext === 'pdf' && fileUrl) {
      const previewUrl = appendPdfViewerParams(fileUrl);
      return (
        <div className="w-full h-full">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={document.title}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    // For text files
    if (ext === 'txt') {
      return (
        <div className="w-full h-full p-4">
          <div className="bg-gray-50 rounded-lg p-4 h-full overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {document.content}
            </pre>
          </div>
        </div>
      );
    }

    // For other file types, or when there's no direct file URL, show text content fallback
    return (
      <div className="w-full h-full p-4">
        <div className="bg-gray-50 rounded-lg p-4 h-full overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {document.content}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0">
        {/* When previewing PDFs, show a clean, full-bleed preview with only a close button */}
        {isPdf ? (
          <div className="relative w-full h-[90vh]">
            {/* Controls bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <div className="px-2 py-1 rounded bg-black/30 text-white text-xs min-w-[48px] text-center">
                  {fitWidth ? 'Fit' : `${zoomLevel}%`}
                </div>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(300, z + 10))}
                  className="px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFitWidth((v) => !v)}
                  className="ml-1 px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-xs"
                >
                  {fitWidth ? 'Actual size' : 'Fit width'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {document.source_url && (
                  <>
                    <button
                      onClick={handleDownload}
                      className="px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-xs inline-flex items-center"
                      disabled={isLoading}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {isLoading ? '...' : 'Download'}
                    </button>
                    <button
                      onClick={() => {
                        const normalized = getNormalizedFileUrl();
                        if (normalized) {
                          // Open with default toolbar to allow native printing
                          window.open(normalized, '_blank');
                        }
                      }}
                      className="px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-xs inline-flex items-center"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </button>
                    <button
                      onClick={handleOpenInNewTab}
                      className="px-2 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-xs inline-flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="ml-1 rounded p-2 bg-black/40 text-white hover:bg-black/60"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="absolute inset-0">{renderPreview()}</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{document.title}</h2>
                  <p className="text-sm text-gray-500">
                    {document.type} • {document.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {document.source_url && (
                  <>
                    <Button onClick={handleDownload} variant="outline" size="sm" disabled={isLoading}>
                      <Download className="h-4 w-4 mr-1" />
                      {isLoading ? 'Downloading...' : 'Download'}
                    </Button>
                    <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Metadata */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {document.date && (
                  <div>
                    <span className="font-medium text-gray-700">Date: </span>
                    <span className="text-gray-600">{new Date(document.date).toLocaleDateString()}</span>
                  </div>
                )}
                {document.jurisdiction && (
                  <div>
                    <span className="font-medium text-gray-700">Jurisdiction: </span>
                    <span className="text-gray-600">{document.jurisdiction}</span>
                  </div>
                )}
                {document.court && (
                  <div>
                    <span className="font-medium text-gray-700">Court: </span>
                    <span className="text-gray-600">{document.court}</span>
                  </div>
                )}
                {document.judge && (
                  <div>
                    <span className="font-medium text-gray-700">Judge: </span>
                    <span className="text-gray-600">{document.judge}</span>
                  </div>
                )}
                {document.citation && (
                  <div>
                    <span className="font-medium text-gray-700">Citation: </span>
                    <span className="text-gray-600">{document.citation}</span>
                  </div>
                )}
                {document.gazetteNumber && (
                  <div>
                    <span className="font-medium text-gray-700">Gazette No: </span>
                    <span className="text-gray-600">{document.gazetteNumber}</span>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Tags: </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {document.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden">
              {renderPreview()}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
