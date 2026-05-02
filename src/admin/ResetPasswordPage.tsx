import { useState } from 'react';
import { Shield, KeyRound, LogIn } from 'lucide-react';
import { resetPassword } from './api';

interface Props {
  token: string;
  onDone: () => void;
}

export function ResetPasswordPage({ token, onDone }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#093057' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
              <p className="text-slate-500 text-sm">Range Tracker Admin</p>
            </div>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center font-medium">
                Password updated successfully!
              </div>
              <button
                onClick={onDone}
                className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600">Choose a new password for the admin account.</p>
              <div>
                <label htmlFor="admin-reset-new-password" className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  id="admin-reset-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="admin-reset-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  id="admin-reset-confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none"
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
    </div>
  );
}
