import { useState } from 'react';
import { LogIn, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { setTenantCredentials } from '../lib/apiClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const REGISTER_URL = `${SUPABASE_URL}/functions/v1/register`;

interface Props {
  onSuccess: () => void;
}

export function TenantLoginPage({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${REGISTER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.data) {
        setError('No account found for this email. Please register first.');
        return;
      }

      const { status, slug, token } = result.data;

      if (status === 'pending') {
        setMessage('Your account is still awaiting admin approval.');
        return;
      }

      if (status === 'suspended') {
        setError('Your account has been suspended. Please contact the administrator.');
        return;
      }

      if (status === 'rejected') {
        setError('Your registration request was not approved.');
        return;
      }

      if (status === 'active' && token) {
        setTenantCredentials(slug, token);
        onSuccess();
        return;
      }

      setError('Unexpected account state. Please contact the administrator.');
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetch(`${REGISTER_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // always show success to avoid leaking account info
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
            <img src="/Range_Tracker_Approved_Logo.png" alt="Range Tracker Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Range Tracker</h1>
            <p className="text-slate-500 text-sm">{showForgot ? 'Reset your password' : 'Sign in to your account'}</p>
          </div>
        </div>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-white border border-red-500 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
              >
                <LogIn className="w-5 h-5" />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  aria-label="Forgot password"
                  onClick={() => { setShowForgot(true); setError(''); setMessage(''); }}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <a href="/register" className="font-medium" style={{ color: '#093057' }}>
                  Request access
                </a>
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
                  If that address is registered, a reset link has been sent. Check your email.
                </div>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-sm text-slate-600">Enter the email address for your account and we'll send a password reset link.</p>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                    placeholder="your@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
                >
                  <Mail className="w-5 h-5" />
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotEmail(''); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
