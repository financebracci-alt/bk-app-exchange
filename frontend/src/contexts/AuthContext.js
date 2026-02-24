import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple 401 redirects
let isRedirecting = false;

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 errors - with protection against redirect loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use a small delay to prevent race conditions
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
    return Promise.reject(error);
  }
);

// Auth Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const loadingRef = useRef(false); // Prevent duplicate loads

  const loadUser = useCallback(async () => {
    // Prevent duplicate simultaneous calls
    if (loadingRef.current) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }

    loadingRef.current = true;
    
    try {
      const response = await api.get('/auth/me');
      if (response.data.ok) {
        setUser(response.data.data.user);
        setWallets(response.data.data.wallets || []);
        setIsAuthenticated(true);
      } else {
        // Invalid response - clear auth
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      // Don't clear storage on network errors - only on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.ok) {
      const { token, user, wallets } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setWallets(wallets || []);
      setIsAuthenticated(true);
      return { success: true, user };
    }
    return { success: false, error: response.data.error };
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.ok) {
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: response.data.error };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setWallets([]);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallets,
        loading,
        isAuthenticated,
        isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
        login,
        register,
        logout,
        refreshUser,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export { api };
export default AuthContext;
