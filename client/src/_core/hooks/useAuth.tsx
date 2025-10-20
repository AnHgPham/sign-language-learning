import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login(email, password);
          
          if (response.access_token && response.user) {
            localStorage.setItem('token', response.access_token);
            set({
              user: response.user,
              token: response.access_token,
              isAuthenticated: true,
            });
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: any) {
          console.error('Login error:', error);
          throw new Error(error.response?.data?.detail || 'Login failed');
        }
      },

      register: async (email: string, password: string, username: string) => {
        try {
          const response = await authApi.register(email, password, username);
          
          if (response.access_token && response.user) {
            localStorage.setItem('token', response.access_token);
            set({
              user: response.user,
              token: response.access_token,
              isAuthenticated: true,
            });
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: any) {
          console.error('Register error:', error);
          throw new Error(error.response?.data?.detail || 'Registration failed');
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
