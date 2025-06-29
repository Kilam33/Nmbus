import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, User, LoginRequest, SignupRequest, ResetPasswordRequest, UpdatePasswordRequest } from '../lib/api';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  validatePasswordStrength: (password: string) => {
    isValid: boolean;
    requirements: {
      minLength: boolean;
      hasUpperCase: boolean;
      hasLowerCase: boolean;
      hasNumbers: boolean;
      hasSpecialChar: boolean;
    }
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (error: any) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  switch (error.message) {
    case 'Invalid login credentials':
      return 'The email or password you entered is incorrect.';
    case 'Email not confirmed':
      return 'Please confirm your email address before logging in.';
    case 'User already registered':
      return 'An account with this email already exists.';
    case 'Password recovery email rate limit exceeded':
      return 'Please wait a few minutes before requesting another password reset.';
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const validatePasswordStrength = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: password.length >= minLength && 
              hasUpperCase && 
              hasLowerCase && 
              hasNumbers && 
              hasSpecialChar,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  };

  // Check for existing session on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // Verify token is valid by making a request to the backend
          const response = await apiClient.get<{ user: User }>('/auth/me');
          if (response.success) {
            setUser(response.data.user);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('expires_at');
          }
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expires_at');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const credentials: LoginRequest = { email, password };
      const response = await apiClient.signIn(credentials);
      
      if (response.success) {
        setUser(response.data.user);
        toast.success('Successfully signed in!');
      }
    } catch (error: any) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
      throw new Error(message);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet security requirements');
      }

      const credentials: SignupRequest = { email, password };
      const response = await apiClient.signUp(credentials);
      
      if (response.success) {
        setUser(response.data.user);
        toast.success('Account created successfully! Please check your email to confirm your account.');
      }
    } catch (error: any) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
      throw new Error(message);
    }
  };

  const signInWithGoogle = async () => {
    // For now, we'll keep the Google OAuth flow through Supabase
    // This can be updated later to use the backend's OAuth endpoints
    toast.error('Google sign-in is not yet implemented with the backend API');
    throw new Error('Google sign-in not implemented');
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
      setUser(null);
      toast.success('Successfully signed out!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Clear user state even if API call fails
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const lastResetAttempt = localStorage.getItem('lastResetAttempt');
      if (lastResetAttempt && Date.now() - parseInt(lastResetAttempt) < 60 * 1000) {
        throw new Error('Please wait 1 minute before requesting another password reset.');
      }

      const request: ResetPasswordRequest = { email };
      const response = await apiClient.resetPassword(request);
      
      if (response.success) {
        localStorage.setItem('lastResetAttempt', Date.now().toString());
        toast.success('Password reset email sent! Please check your inbox.');
      }
    } catch (error: any) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
      throw new Error(message);
    }
  };
  
  const updatePassword = async (password: string) => {
    try {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet security requirements');
      }

      const request: UpdatePasswordRequest = { password };
      const response = await apiClient.updatePassword(request);
      
      if (response.success) {
        toast.success('Password updated successfully!');
      }
    } catch (error: any) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    validatePasswordStrength,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}