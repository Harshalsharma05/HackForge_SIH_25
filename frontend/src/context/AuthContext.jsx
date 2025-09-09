import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token === 'mock-token') {
        // Mock user for testing
        setUser({ id: 1, email: 'admin@authority.com', role: 'authority' });
      }
      // Real API call (commented for now)
      // if (token) {
      //   const response = await authAPI.verifyToken();
      //   setUser(response.data.user);
      // }
    } catch (error) {
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Mock login for testing
      if (credentials.email === 'admin@authority.com' && credentials.password === 'admin123') {
        const mockUser = { id: 1, email: credentials.email, role: 'authority' };
        localStorage.setItem('authToken', 'mock-token');
        setUser(mockUser);
        return { success: true };
      }
      
      // Real API call (commented for now)
      // const response = await authAPI.login(credentials);
      // const { token, user } = response.data;
      // localStorage.setItem('authToken', token);
      // setUser(user);
      // return { success: true };
      
      return { 
        success: false, 
        error: 'Invalid credentials. Use admin@authority.com / admin123' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};