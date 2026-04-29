import { useState, useEffect } from 'react';
import { ArrowLeft, User, AlertTriangle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase } from '../lib/apiClient';

export function ShooterProfileScreen() {
  const { setCurrentScreen, selectedShooter, setSelectedShooter } = useApp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (selectedShooter) {
      setFirstName(selectedShooter.first_name);
      setLastName(selectedShooter.last_name);
      setEmail(selectedShooter.email || '');
      setPhone(selectedShooter.phone || '');
    }
  }, [selectedShooter]);

  async function handleSave() {
    if (!selectedShooter || !firstName.trim() || !lastName.trim()) {
      alert('First name and last name are required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shooters')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', selectedShooter.id)
        .select()
        .single();

      if (error) throw error;

      setSelectedShooter(data);
      alert('Profile updated successfully!');
      setCurrentScreen('settings');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedShooter) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shooters')
        .delete()
        .eq('id', selectedShooter.id);

      if (error) throw error;

      setSelectedShooter(null);
      setCurrentScreen('home');
      alert('Shooter account deleted successfully.');
    } catch (error) {
      console.error('Error deleting shooter:', error);
      alert('Error deleting shooter account. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleCancel() {
    setCurrentScreen('settings');
  }

  if (!selectedShooter) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <button
            type="button"
            aria-label="Back to Settings"
            onClick={handleCancel}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Settings
          </button>

          <div className="flex items-center gap-3 mb-8">
            <User className="w-8 h-8" style={{ color: '#093057' }} />
            <h1 className="text-2xl font-bold text-slate-900">Shooter Profile</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="profile-first-name" className="block text-sm font-medium text-slate-700 mb-2">
                First Name *
              </label>
              <input
                id="profile-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-last-name" className="block text-sm font-medium text-slate-700 mb-2">
                Last Name *
              </label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex-1 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>

            <div className="border-t border-slate-200 pt-8 mt-8">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="w-full text-red-600 font-semibold py-2 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete User Account
              </button>
              <p className="text-sm text-slate-600 mt-2 text-center">
                This is a permanent deletion and all shooter information, settings and records will be deleted for this account. Please carefully consider your action.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Confirm Deletion
                </h2>
                <p className="text-slate-600 text-sm">
                  This is a permanent deletion and all shooter information, settings and records will be deleted for this account. Please carefully consider your action. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
