import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('waterwatch_token');
      if (token) {
        try {
          const profile = await authService.fetchProfile();
          setUser({
            id: profile.id,
            role: profile.role,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            citizen_profile: profile.citizen_profile,
            worker_profile: profile.worker_profile
          });
        } catch (e) {
          authService.logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const profile = await authService.fetchProfile();
    const userData = {
      id: profile.id,
      role: profile.role,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      citizen_profile: profile.citizen_profile,
      worker_profile: profile.worker_profile
    };
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    return authService.register(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
    isWorker: user?.role === 'worker',
    isCitizen: user?.role === 'citizen'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

