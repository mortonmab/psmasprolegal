import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiService from '../services/apiService';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      signIn: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await apiService.post<{ user: User; token: string }>('/auth/login', {
            email,
            password
          });
          
          set({ 
            user: response.user, 
            token: response.token,
            loading: false 
          });
          
          // Set token in localStorage for API requests
          localStorage.setItem('authToken', response.token);
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signOut: async () => {
        try {
          await apiService.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, token: null });
          localStorage.removeItem('authToken');
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
          set({ user: null, token: null });
          return;
        }

        set({ loading: true });
        try {
          const user = await apiService.get<User>('/auth/me');
          set({ user, token, loading: false });
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, token: null, loading: false });
          localStorage.removeItem('authToken');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);