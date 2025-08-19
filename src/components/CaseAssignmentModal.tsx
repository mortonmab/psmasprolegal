import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import apiService from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import type { User, CaseAssignment } from '../lib/types';

interface CaseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseName: string;
  onAssignmentSuccess: () => void;
  isAdmin?: boolean;
}

export function CaseAssignmentModal({ 
  isOpen, 
  onClose, 
  caseId, 
  caseName,
  onAssignmentSuccess,
  isAdmin = false
}: CaseAssignmentModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadAssignments();
    }
  }, [isOpen, caseId]);

  const loadUsers = async () => {
    try {
      const response = await apiService.get<User[]>('/users');
      setUsers(response);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await apiService.get<CaseAssignment[]>(`/cases/${caseId}/assignments`);
      setAssignments(response);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setError('Failed to load current assignments');
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId || !selectedRole) {
      setError('Please select both a user and a role');
      return;
    }

    // Check if user is already assigned
    if (assignments.some(assignment => assignment.user_id === selectedUserId)) {
      setError('This user is already assigned to this case');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiService.post(`/cases/${caseId}/assignments`, {
        user_id: selectedUserId,
        role: selectedRole,
        assigned_by: user?.id || ''
      });

      // Reset form
      setSelectedUserId('');
      setSelectedRole('');
      
      // Reload assignments
      await loadAssignments();
      
      // Notify parent component
      onAssignmentSuccess();
    } catch (error) {
      console.error('Error adding assignment:', error);
      setError('Failed to add assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setLoading(true);
    setError('');

    try {
      await apiService.delete(`/cases/${caseId}/assignments/${assignmentId}`);
      await loadAssignments();
      onAssignmentSuccess();
    } catch (error) {
      console.error('Error removing assignment:', error);
      setError('Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'lead_attorney': return 'Lead Attorney';
      case 'associate_attorney': return 'Associate Attorney';
      case 'paralegal': return 'Paralegal';
      case 'assistant': return 'Assistant';
      default: return role;
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isAdmin ? 'Manage Case Assignments' : 'Add Collaborators'}
              </h2>
              <p className="text-sm text-gray-500">{caseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Add New Assignment */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              {isAdmin ? 'Add New Assignment' : 'Add New Collaborator'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-select">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(user => !assignments.some(assignment => assignment.user_id === user.id))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role-select">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_attorney">Lead Attorney</SelectItem>
                    <SelectItem value="associate_attorney">Associate Attorney</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
                              <Button 
                  onClick={handleAddAssignment}
                  disabled={loading || !selectedUserId || !selectedRole}
                  className="w-full"
                >
                  {loading ? 'Adding...' : `Add ${isAdmin ? 'Assignment' : 'Collaborator'}`}
                </Button>
            </div>
          </div>

          {/* Current Assignments */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {isAdmin ? 'Current Assignments' : 'Current Collaborators'}
            </h3>
            
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No {isAdmin ? 'assignments' : 'collaborators'} yet</p>
                <p className="text-sm">Add users to this case to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <div 
                    key={assignment.id} 
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {getUserName(assignment.user_id)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getRoleDisplayName(assignment.role)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={loading}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
