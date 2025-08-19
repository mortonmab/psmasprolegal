import apiService from './apiService';
import type { User } from '../lib/types';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  department: string;
  position: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/signup', data);
      return response;
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  },

  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/signin', { email, password });
      return response;
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await apiService.post('/auth/signout');
      // Clear any stored tokens
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('SignOut error:', error);
      throw error;
    }
  },

  async resetPassword(email: string): Promise<void> {
    try {
      await apiService.post('/auth/reset-password', { email });
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
}; 