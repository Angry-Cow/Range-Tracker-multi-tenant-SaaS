import { useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const REGISTER_URL = `${SUPABASE_URL}/functions/v1/register`;

interface Props {
  token: string;
}

export function TenantResetPasswordPage({ token }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${REGISTER_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, newPassword }),
      });
      const result = await res.json();
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg p-2" style={{ backgroundColor: '#093057' }}>
            <img src="/SASS_Favicon_Cropped_Smaller.png" alt="Range Tracker Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Range Tracker</h1>
            <p className="text-slate-500 text-sm">Set a new password</p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center font-medium">
              Password updated successfully!
            </div>
            <a
              href="/"
              className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">Choose a new password for your account. It must be at least 8 characters and include uppercase, lowercase, a number, and a special character.</p>
            <div>
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                placeholder="New password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat new password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
              />
            </div>
            {error && (
              <div className="p-3 bg-white border border-red-500 rounded-lg text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
            >
              <KeyRound className="w-5 h-5" />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
