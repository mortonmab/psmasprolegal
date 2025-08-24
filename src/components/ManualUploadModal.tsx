import React, { useState } from 'react';
import { Upload, X, FileText, BookOpen, Gavel, FileCheck, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useToast } from './ui/use-toast';

interface ManualUploadData {
  title: string;
  source_type: 'case_law' | 'legislation' | 'regulation' | 'gazette';
  file?: File;
}

interface ManualUploadModalProps {
  onUploadSuccess?: () => void;
}

export function ManualUploadModal({ onUploadSuccess }: ManualUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState<ManualUploadData>({
    title: '',
    source_type: 'case_law'
  });
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadData(prev => ({
        ...prev,
        file: file,
        title: file.name.replace(/\.[^/.]+$/, "") // Remove file extension for title
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadData.title || !uploadData.file) {
      toast({
        title: "Validation Error",
        description: "Please select a file and provide a title",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('source_type', uploadData.source_type);
      formData.append('file', uploadData.file);

      const response = await fetch('/api/scraped-data/manual-upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: "Legal resource uploaded successfully",
        });
        setIsOpen(false);
        setUploadData({
          title: '',
          source_type: 'case_law'
        });
        onUploadSuccess?.();
      } else {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Upload failed';
        } catch (parseError) {
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload legal resource',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'case_law':
        return 'Case Law';
      case 'legislation':
        return 'Legislation';
      case 'regulation':
        return 'Regulation';
      case 'gazette':
        return 'Gazette';
      default:
        return 'Case Law';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Upload className="h-4 w-4 mr-2" />
          Upload Legal Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Legal Resource
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resource Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="source_type">Resource Type</Label>
            <Select 
              value={uploadData.source_type} 
              onValueChange={(value: 'case_law' | 'legislation' | 'regulation' | 'gazette') => 
                setUploadData(prev => ({ ...prev, source_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="case_law">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Case Law
                  </div>
                </SelectItem>
                <SelectItem value="legislation">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Legislation
                  </div>
                </SelectItem>
                <SelectItem value="regulation">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Regulation
                  </div>
                </SelectItem>
                <SelectItem value="gazette">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Gazette
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Upload Document *</Label>
            <Input
              id="file"
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="cursor-pointer"
              required
            />
            <p className="text-sm text-gray-500">
              Supported formats: TXT, PDF, DOC, DOCX
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={uploadData.title}
              onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter the title of the legal resource"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resource
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
