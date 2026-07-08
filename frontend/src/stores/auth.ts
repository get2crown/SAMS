import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  faceEnrolled?: boolean;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  // Join an existing company:
  companyId?: string;
  // ...or create a new one (becomes that company's admin):
  companyName?: string;
  officeLatitude?: number;
  officeLongitude?: number;
  geofenceRadius?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // The signed-in user's own organization name — used to brand the app
  // shell per-tenant (e.g. "Acme Inc · AttendanceOS"). Fetched once per
  // session rather than per-page so navigating around doesn't re-fetch it.
  companyName: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  fetchCompanyName: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      companyName: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('token', data.accessToken);
          set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
          get().fetchCompanyName();
          return true;
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
          return false;
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', payload);
          localStorage.setItem('token', data.accessToken);
          set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
          get().fetchCompanyName();
          return true;
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, companyName: null });
      },

      fetchCurrentUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data, isAuthenticated: true });
          if (!get().companyName) get().fetchCompanyName();
        } catch (err: any) {
          // Only drop the session on an actual auth failure — a network
          // hiccup or transient 5xx shouldn't log the user out. The
          // axios interceptor already handles 401 redirects globally.
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            set({ user: null, token: null, isAuthenticated: false, companyName: null });
          }
        }
      },

      fetchCompanyName: async () => {
        try {
          const { data } = await api.get('/companies/me');
          set({ companyName: data.name });
        } catch {
          // Non-critical — the shell just falls back to the generic name.
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        companyName: state.companyName,
      }),
    }
  )
);
