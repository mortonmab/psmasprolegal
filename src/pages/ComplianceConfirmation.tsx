import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComplianceReminderService } from '../services/complianceReminderService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';

export function ComplianceConfirmation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [formData, setFormData] = useState({
    confirmedBy: '',
    confirmedEmail: '',
    confirmationType: 'submitted' as 'submitted' | 'renewed' | 'extended' | 'completed',
    notes: ''
  });

  useEffect(() => {
    if (token) {
      loadConfirmationData();
    }
  }, [token]);

  const loadConfirmationData = async () => {
    try {
      if (!token) return;
      
      const data = await ComplianceReminderService.getConfirmationByToken(token);
      if (data) {
        setConfirmationData(data);
        // Pre-fill email if available
        setFormData(prev => ({
          ...prev,
          confirmedEmail: data.recipient.email,
          confirmedBy: data.recipient.name
        }));
      } else {
        toast({
          title: 'Invalid Token',
          description: 'This confirmation link is invalid or has expired.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading confirmation data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load confirmation details.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    if (!formData.confirmedBy || !formData.confirmedEmail) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and email address.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const success = await ComplianceReminderService.confirmCompliance(token, formData);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Compliance has been confirmed successfully. You will no longer receive reminder emails for this item.',
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to confirm compliance. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error confirming compliance:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while confirming compliance.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading confirmation details...</p>
        </div>
      </div>
    );
  }

  if (!confirmationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Confirmation Link</CardTitle>
            <CardDescription>
              This confirmation link is invalid or has expired. Please contact the legal department for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { complianceRecord, recipient } = confirmationData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-600">Compliance Confirmation</CardTitle>
            <CardDescription>
              Please confirm that you have completed the required compliance action
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Compliance Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Compliance Item Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {complianceRecord.name}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {complianceRecord.description}
                </div>
                <div>
                  <span className="font-medium">Due Date:</span> {new Date(complianceRecord.dueDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Frequency:</span> {complianceRecord.frequency.charAt(0).toUpperCase() + complianceRecord.frequency.slice(1)}
                </div>
              </div>
            </div>

            {/* Confirmation Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="confirmedBy">Your Name *</Label>
                <Input
                  id="confirmedBy"
                  value={formData.confirmedBy}
                  onChange={(e) => handleInputChange('confirmedBy', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmedEmail">Your Email *</Label>
                <Input
                  id="confirmedEmail"
                  type="email"
                  value={formData.confirmedEmail}
                  onChange={(e) => handleInputChange('confirmedEmail', e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmationType">Confirmation Type *</Label>
                <Select
                  value={formData.confirmationType}
                  onValueChange={(value: 'submitted' | 'renewed' | 'extended' | 'completed') => 
                    handleInputChange('confirmationType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select confirmation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the appropriate action that was taken for this compliance item
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any relevant notes about the completion..."
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notice</h4>
                <p className="text-sm text-yellow-700">
                  By confirming this compliance item, you acknowledge that the required action has been completed. 
                  You will no longer receive reminder emails for this item.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Confirming...' : 'Confirm Compliance Completion'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
