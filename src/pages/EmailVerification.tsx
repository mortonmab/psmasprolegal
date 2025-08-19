import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import apiService from '../services/apiService';

export function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'verifying' | 'set-password' | 'success'>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This verification link is invalid or has expired.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    // Verify the email first
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await apiService.post('/auth/verify-email', { token });
      setStep('set-password');
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully. Please set your password.",
      });
    } catch (error) {
      console.error('Error verifying email:', error);
      toast({
        title: "Verification Failed",
        description: "This verification link is invalid or has expired.",
        variant: "destructive"
      });
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    // Validate password
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordError('');
    setLoading(true);

    try {
      await apiService.post('/auth/set-password', { token, password });
      setStep('success');
      toast({
        title: "Success",
        description: "Your password has been set successfully. You can now log in.",
      });
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: "Error",
        description: "Failed to set password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Verifying Email</h2>
            <p className="mt-2 text-gray-600">Please wait while we verify your email address...</p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'set-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Set Your Password</h2>
            <p className="mt-2 text-gray-600">
              Your email has been verified. Please create a secure password for your account.
            </p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                className="mt-1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="mt-1"
              />
            </div>

            {passwordError && (
              <div className="text-red-600 text-sm">{passwordError}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Account Setup Complete!</h2>
            <p className="mt-2 text-gray-600">
              Your email has been verified and your password has been set successfully.
              You can now log in to your ProLegal account.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
