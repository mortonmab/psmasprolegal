import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import { userService } from '../services/userService';
import { ExternalUserService, ExternalUser } from '../services/externalUserService';
import { ComplianceReminderService, ComplianceReminderRecipient } from '../services/complianceReminderService';

interface ComplianceRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  complianceRecordId: string;
  complianceRecordName: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function ComplianceRecipientsModal({ isOpen, onClose, complianceRecordId, complianceRecordName }: ComplianceRecipientsModalProps) {
  const [recipients, setRecipients] = useState<ComplianceReminderRecipient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    type: 'internal' as 'internal' | 'external' | 'manual',
    userId: '',
    externalUserId: '',
    email: '',
    name: '',
    role: 'primary'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadRecipients();
      loadUsers();
      loadExternalUsers();
    }
  }, [isOpen, complianceRecordId]);

  const loadRecipients = async () => {
    try {
      setIsLoading(true);
      const recipients = await ComplianceReminderService.getRecipients(complianceRecordId);
      setRecipients(recipients);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recipients',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await userService.getAllUsers();
      setUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadExternalUsers = async () => {
    try {
      const externalUsers = await ExternalUserService.getExternalUsers();
      setExternalUsers(externalUsers);
    } catch (error) {
      console.error('Error loading external users:', error);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.name || !newRecipient.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in name and email',
        variant: 'destructive'
      });
      return;
    }

    setIsAddingRecipient(true);
    try {
      let recipientData: any = {
        complianceRecordId,
        email: newRecipient.email,
        name: newRecipient.name,
        role: newRecipient.role
      };

      if (newRecipient.type === 'internal') {
        recipientData.userId = newRecipient.userId;
      } else if (newRecipient.type === 'external') {
        recipientData.externalUserId = newRecipient.externalUserId;
      }

      await ComplianceReminderService.addRecipient(recipientData);
      
      toast({
        title: 'Success',
        description: 'Recipient added successfully'
      });

      // Reset form and reload recipients
      setNewRecipient({
        type: 'internal',
        userId: '',
        externalUserId: '',
        email: '',
        name: '',
        role: 'primary'
      });
      setShowAddForm(false);
      loadRecipients();
    } catch (error) {
      console.error('Error adding recipient:', error);
      toast({
        title: 'Error',
        description: 'Failed to add recipient',
        variant: 'destructive'
      });
    } finally {
      setIsAddingRecipient(false);
    }
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    try {
      await ComplianceReminderService.removeRecipient(recipientId);
      toast({
        title: 'Success',
        description: 'Recipient removed successfully'
      });
      loadRecipients();
    } catch (error) {
      console.error('Error removing recipient:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove recipient',
        variant: 'destructive'
      });
    }
  };

  const handleScheduleReminders = async () => {
    try {
      await ComplianceReminderService.scheduleReminders(complianceRecordId);
      toast({
        title: 'Success',
        description: 'Reminders scheduled successfully'
      });
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule reminders',
        variant: 'destructive'
      });
    }
  };

  const getRecipientDisplayName = (recipient: ComplianceReminderRecipient) => {
    if (recipient.userId) {
      const user = users.find(u => u.id === recipient.userId);
      return user ? `${user.full_name} (Internal)` : recipient.name;
    } else if (recipient.externalUserId) {
      const externalUser = externalUsers.find(u => u.id === recipient.externalUserId);
      return externalUser ? `${externalUser.name} (External)` : recipient.name;
    }
    return `${recipient.name} (Manual)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manage Reminder Recipients
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {complianceRecordName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipients List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Current Recipients</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScheduleReminders}
                  disabled={recipients.length === 0}
                >
                  Schedule Reminders
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading recipients...</p>
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recipients added yet</p>
                <p className="text-sm text-gray-500">Add recipients to receive reminder emails</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{getRecipientDisplayName(recipient)}</p>
                        <p className="text-sm text-gray-600">{recipient.email}</p>
                        {recipient.role && (
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {recipient.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRecipient(recipient.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Recipient Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-4">Add New Recipient</h4>
              
              <div className="space-y-4">
                <div>
                  <Label>Recipient Type</Label>
                  <Select
                    value={newRecipient.type}
                    onValueChange={(value: 'internal' | 'external' | 'manual') =>
                      setNewRecipient(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal User</SelectItem>
                      <SelectItem value="external">External User</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newRecipient.type === 'internal' && (
                  <div>
                    <Label>Select User</Label>
                    <Select
                      value={newRecipient.userId}
                      onValueChange={(value) => {
                        const user = users.find(u => u.id === value);
                        setNewRecipient(prev => ({
                          ...prev,
                          userId: value,
                          email: user?.email || '',
                          name: user?.full_name || ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newRecipient.type === 'external' && (
                  <div>
                    <Label>Select External User</Label>
                    <Select
                      value={newRecipient.externalUserId}
                      onValueChange={(value) => {
                        const externalUser = externalUsers.find(u => u.id === value);
                        setNewRecipient(prev => ({
                          ...prev,
                          externalUserId: value,
                          email: externalUser?.email || '',
                          name: externalUser?.name || ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an external user" />
                      </SelectTrigger>
                      <SelectContent>
                        {externalUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(newRecipient.type === 'manual' || newRecipient.type === 'external') && (
                  <>
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newRecipient.email}
                        onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Role</Label>
                  <Select
                    value={newRecipient.role}
                    onValueChange={(value) => setNewRecipient(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="cc">CC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddRecipient}
                    disabled={isAddingRecipient}
                  >
                    {isAddingRecipient ? 'Adding...' : 'Add Recipient'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
