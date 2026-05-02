import { useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase } from '../lib/apiClient';

export function NewShooterScreen() {
  const { setCurrentScreen, setSelectedShooter, planInfo, setPlanInfo } = useApp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const atShooterLimit = !!(
    planInfo &&
    !planInfo.unlimited &&
    planInfo.shooter_limit !== null &&
    planInfo.shooter_count >= planInfo.shooter_limit
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (atShooterLimit) {
      alert(`Shooter limit reached. Your Free plan allows up to ${planInfo!.shooter_limit} shooters. Please upgrade to add more.`);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shooters')
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            notes,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.message && error.message.toLowerCase().includes('limit')) {
          alert(error.message);
          return;
        }
        throw error;
      }

      if (planInfo) {
        setPlanInfo({ ...planInfo, shooter_count: planInfo.shooter_count + 1 });
      }

      setSelectedShooter(data);
      setCurrentScreen('settings');
    } catch (error) {
      console.error('Error creating shooter:', error);
      alert('Error creating shooter. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setCurrentScreen('home');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <button
            type="button"
            aria-label="Back"
            onClick={handleCancel}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="w-8 h-8" style={{ color: '#093057' }} />
            <h1 className="text-2xl font-bold text-slate-900">New Shooter</h1>
          </div>

          {atShooterLimit && (
            <div className="mb-6 px-4 py-3 bg-white border border-red-500 rounded-lg text-sm text-red-700">
              Shooter limit reached. Your Free plan allows up to {planInfo!.shooter_limit} shooters. Please upgrade your plan to add more shooters.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-shooter-first-name" className="block text-sm font-medium text-slate-700 mb-1">
                First Name *
              </label>
              <input
                id="new-shooter-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={atShooterLimit}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="new-shooter-last-name" className="block text-sm font-medium text-slate-700 mb-1">
                Last Name *
              </label>
              <input
                id="new-shooter-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={atShooterLimit}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="new-shooter-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="new-shooter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={atShooterLimit}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="new-shooter-phone" className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                id="new-shooter-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={atShooterLimit}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="new-shooter-notes" className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                id="new-shooter-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={atShooterLimit}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || atShooterLimit}
                className="flex-1 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors bg-primary-900 hover:bg-primary-800 disabled:bg-slate-500"
              >
                {loading ? 'Creating...' : 'Enter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
