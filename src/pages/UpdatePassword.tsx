import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, X, Check, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../lib/api';

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center text-sm">
    {met ? (
      <Check className="h-4 w-4 text-green-500 mr-2" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500 mr-2" />
    )}
    <span className={met ? 'text-green-500' : 'text-red-500'}>{text}</span>
  </div>
);

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChar: false
  });
  
  const { updatePassword, validatePasswordStrength } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      // Get token from hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const token = hashParams.get('token');

      if (!token) {
        setTokenError(true);
        setError('Invalid password reset link. Please request a new one.');
        return;
      }

      try {
        // Verify the token with API
        const response = await apiClient.post('/auth/verify-reset-token', { token });

        if (!response.success) {
          console.error("Token verification failed:", response.error);
          setTokenError(true);
          setError('This password reset link has expired or is invalid. Please request a new one.');
          return;
        }

        // Check if user has OAuth provider
        const userResponse = await apiClient.get<{ user: any }>('/auth/me');
        if (userResponse.success && userResponse.data?.user?.provider && userResponse.data.user.provider !== 'email') {
          setIsOAuthUser(true);
          return;
        }

        setHasValidSession(true);
      } catch (err) {
        console.error("Token verification error:", err);
        setTokenError(true);
        setError('This password reset link has expired or is invalid. Please request a new one.');
      }
    };

    verifyToken();
  }, []);

  const updatePasswordRequirements = (pass: string) => {
    const requirements = validatePasswordStrength(pass).requirements;
    setPasswordRequirements(requirements);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!Object.values(passwordRequirements).every(req => req)) {
      setError('Password does not meet all requirements');
      return;
    }
  
    try {
      setError('');
      setLoading(true);
      await updatePassword(password);
      toast.success('Password updated successfully');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error("Password update error:", err);
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-red-600/20 flex items-center justify-center mr-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Link Expired</h2>
              </div>
              <Link to="/login" className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </Link>
            </div>

            <div className="text-center">
              <p className="text-slate-300 mb-4">
                {error || 'This password reset link has expired or is invalid.'}
              </p>
              <p className="text-slate-400 text-sm mb-6">
                For security reasons, password reset links expire after a short period. Please request a new one.
              </p>
              <Link
                to="/reset-password"
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Request New Reset Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isOAuthUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-indigo-600/20 flex items-center justify-center mr-3">
                  <KeyRound className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Social Login Account</h2>
              </div>
              <Link to="/login" className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </Link>
            </div>

            <div className="text-center">
              <p className="text-slate-300 mb-4">
                Your account uses social login.
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Please use the "Sign in with Google" option on the login page instead of password reset.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/20 flex items-center justify-center mr-3">
                <KeyRound className="h-5 w-5 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Update Password</h2>
            </div>
            <Link to="/login" className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}

          {hasValidSession ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    updatePasswordRequirements(e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
                <div className="mt-2 space-y-1">
                  <RequirementItem met={passwordRequirements.minLength} text="At least 8 characters" />
                  <RequirementItem met={passwordRequirements.hasUpperCase} text="At least one uppercase letter" />
                  <RequirementItem met={passwordRequirements.hasLowerCase} text="At least one lowercase letter" />
                  <RequirementItem met={passwordRequirements.hasNumbers} text="At least one number" />
                  <RequirementItem met={passwordRequirements.hasSpecialChar} text="At least one special character" />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5 mr-2" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <svg className="animate-spin mx-auto h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-slate-300">Verifying your reset link...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}