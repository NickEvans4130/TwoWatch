import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('tw_token'),
  loading: true,

  setAuth: (token, user) => {
    localStorage.setItem('tw_token', token);
    set({ token, user, loading: false });
  },

  logout: () => {
    localStorage.removeItem('tw_token');
    localStorage.removeItem('tw_redirect');
    set({ token: null, user: null, loading: false });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('tw_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await api.get<User>('/api/auth/me');
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('tw_token');
      set({ user: null, token: null, loading: false });
    }
  },
}));
