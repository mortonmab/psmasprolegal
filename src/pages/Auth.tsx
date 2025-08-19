import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, User, Building, Briefcase, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/apiService';

type AuthMode = 'signin' | 'signup' | 'forgot-password';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signOut, user, checkAuth } = useAuth();

  // Check if user is already authenticated
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: '',
    department: '',
    position: ''
  });

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'attorney', label: 'Attorney' },
    { value: 'paralegal', label: 'Paralegal' },
    { value: 'staff', label: 'Staff' }
  ];

  const departments = [
    'Legal',
    'Administration',
    'Finance',
    'IT',
    'HR',
    'Operations'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password);
        toast({
          title: "Login Successful",
          description: "Welcome back to ProLegal!",
        });
        navigate('/');
      } else if (mode === 'signup') {
        try {
          await apiService.post('/users', {
            email: formData.email,
            password_hash: 'temp123', // Will be replaced when user sets password
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.position || null
          });
          
          toast({
            title: "Registration Successful",
            description: "Please check your email to verify your account and set your password.",
          });
          setMode('signin');
        } catch (error) {
          console.error('Signup error:', error);
          toast({
            title: "Registration Failed",
            description: error instanceof Error 
              ? error.message 
              : "Failed to create account. Please try again.",
            variant: "destructive"
          });
        }
      } else if (mode === 'forgot-password') {
        await apiService.post('/auth/forgot-password', { email: formData.email });
        toast({
          title: "Password Reset Email Sent",
          description: "Please check your email for password reset instructions.",
        });
        setMode('signin');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg mb-4">
              <Scale className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Prolegal</h1>
            <p className="text-gray-600 text-center max-w-sm">
              Professional Legal Management System
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                {mode === 'signin' ? 'Welcome Back' : 
                 mode === 'signup' ? 'Create Account' : 
                 'Reset Password'}
              </h2>
              <p className="text-gray-600 text-center text-sm">
                {mode === 'signin' ? 'Sign in to access your account' : 
                 mode === 'signup' ? 'Join Prolegal today' : 
                 'Enter your email to reset your password'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              {mode !== 'forgot-password' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-12 pr-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Signup Fields */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="pl-12 h-12 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        required
                      >
                        <option value="">Select a role</option>
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="pl-12 h-12 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        required
                      >
                        <option value="">Select a department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        placeholder="Enter your position"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Please wait...
                    </div>
                  ) : (
                    mode === 'signin' ? 'Sign In' :
                    mode === 'signup' ? 'Create Account' :
                    'Reset Password'
                  )}
                </Button>
              </div>
            </form>

            {/* Mode Switcher */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    {mode === 'signin' ? "Don't have an account?" :
                     mode === 'signup' ? "Already have an account?" :
                     "Remember your password?"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col space-y-3">
                {mode === 'signin' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode('signup')}
                      className="h-11 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    >
                      Create an account
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setMode('forgot-password')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Forgot your password?
                    </Button>
                  </>
                )}
                {mode === 'signup' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode('signin')}
                    className="h-11 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  >
                    Sign in instead
                  </Button>
                )}
                {mode === 'forgot-password' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode('signin')}
                    className="h-11 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  >
                    Back to sign in
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-gray-500 text-sm">
          PSMAS Prolegal by Soxfort Solutions © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}