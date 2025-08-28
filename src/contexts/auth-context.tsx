"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAuth = sessionStorage.getItem('is-authenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Could not read from session storage", error);
    }
    setIsLoading(false);
  }, []);

  const login = (password: string) => {
    if (password === 'Manoj34001') {
      try {
        sessionStorage.setItem('is-authenticated', 'true');
      } catch (error) {
        console.error("Could not write to session storage", error);
      }
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };
  
  const logout = () => {
    try {
      sessionStorage.removeItem('is-authenticated');
    } catch (error) {
      console.error("Could not remove from session storage", error);
    }
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
