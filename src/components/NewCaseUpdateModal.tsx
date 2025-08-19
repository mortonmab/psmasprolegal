import React, { useState } from 'react';
import { X, Calendar, FileText, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import type { CaseUpdate } from '../lib/types';

interface NewCaseUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (update: {
    user_id: string;
    update_type: CaseUpdate['update_type'];
    title: string;
    content?: string;
  }) => Promise<void>;
  caseId: string;
}

export function NewCaseUpdateModal({ isOpen, onClose, onSubmit, caseId }: NewCaseUpdateModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updateType, setUpdateType] = useState<CaseUpdate['update_type']>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        user_id: user.id,
        update_type: updateType,
        title: title.trim(),
        content: description.trim() || undefined,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setUpdateType('note');
      onClose();
    } catch (error) {
      console.error('Error creating case update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Case Update</h2>
              <p className="text-sm text-gray-500">Case #{caseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Update Type */}
          <div className="space-y-2">
            <Label htmlFor="updateType">Update Type</Label>
            <Select value={updateType} onValueChange={(value: CaseUpdate['update_type']) => setUpdateType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select update type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="document_added">Document Added</SelectItem>
                <SelectItem value="court_date">Court Date</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter update title"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter update description (optional)"
              rows={4}
            />
          </div>

          {/* Date (auto-generated) */}
          <div className="space-y-2">
            <Label>Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={new Date().toLocaleDateString()}
                disabled
                className="pl-10 bg-gray-50"
              />
            </div>
            <p className="text-xs text-gray-500">Update will be timestamped automatically</p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
