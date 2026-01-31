'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthTokens, LoginCredentials, RegisterData } from './types';
import api from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'travel_planner_tokens';

function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setupAxiosInterceptor = useCallback((tokens: AuthTokens) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
  }, []);

  const clearAxiosInterceptor = useCallback(() => {
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch {
      return null;
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) return false;

    try {
      const response = await api.post<AuthTokens>('/auth/refresh', {
        refresh_token: tokens.refresh_token,
      });
      const newTokens = response.data;
      storeTokens(newTokens);
      setupAxiosInterceptor(newTokens);
      return true;
    } catch {
      clearTokens();
      clearAxiosInterceptor();
      setUser(null);
      return false;
    }
  }, [setupAxiosInterceptor, clearAxiosInterceptor]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<AuthTokens>('/auth/login', credentials);
    const tokens = response.data;
    storeTokens(tokens);
    setupAxiosInterceptor(tokens);
    const userData = await fetchUser();
    if (!userData) {
      throw new Error('Failed to fetch user data');
    }
    setUser(userData);
  }, [setupAxiosInterceptor, fetchUser]);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    await api.post('/auth/register', data);
    // After registration, log in automatically
    await login({ email: data.email, password: data.password });
  }, [login]);

  const logout = useCallback(() => {
    clearTokens();
    clearAxiosInterceptor();
    setUser(null);
  }, [clearAxiosInterceptor]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const tokens = getStoredTokens();
      if (tokens) {
        setupAxiosInterceptor(tokens);
        const userData = await fetchUser();
        if (userData) {
          setUser(userData);
        } else {
          // Token might be expired, try refresh
          const refreshed = await refreshTokens();
          if (refreshed) {
            const refreshedUser = await fetchUser();
            setUser(refreshedUser);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [setupAxiosInterceptor, fetchUser, refreshTokens]);

  // Set up axios interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await refreshTokens();
          if (refreshed) {
            const tokens = getStoredTokens();
            if (tokens) {
              originalRequest.headers['Authorization'] = `Bearer ${tokens.access_token}`;
              return api(originalRequest);
            }
          }

          // Refresh failed, log out
          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshTokens, logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
