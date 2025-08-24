import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CloseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  caseName: string;
  loading?: boolean;
}

export function CloseCaseModal({ isOpen, onClose, onConfirm, caseName, loading = false }: CloseCaseModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for closing this case');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters long');
      return;
    }

    setError('');
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Close Case
                  </h3>
                  {!loading && (
                    <button
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    You are about to close the case: <span className="font-medium text-gray-900">"{caseName}"</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Please provide a reason for closing this case. This action cannot be easily undone.
                  </p>
                  
                  <form onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="close-reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for closing case *
                      </label>
                      <textarea
                        id="close-reason"
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          error ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Please provide a detailed reason for closing this case..."
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (error) setError('');
                        }}
                        disabled={loading}
                        maxLength={500}
                      />
                      <div className="flex justify-between mt-1">
                        {error ? (
                          <p className="text-sm text-red-600">{error}</p>
                        ) : (
                          <p className="text-xs text-gray-500">Minimum 10 characters required</p>
                        )}
                        <p className="text-xs text-gray-500">{reason.length}/500</p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !reason.trim() || reason.trim().length < 10}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Closing Case...
                </>
              ) : (
                'Close Case'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
