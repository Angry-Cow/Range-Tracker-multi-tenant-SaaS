import { LOGO_LIGHT } from '../assets/logos';
import { useState, useEffect } from 'react';
import { Settings, History, Plus, LogOut, TrendingUp, CreditCard } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiClient as supabase, clearTenantCredentials, fetchPlanInfo, createPortalSession } from '../lib/apiClient';
import { UpgradePlanModal } from '../components/UpgradePlanModal';
import type { Shooter } from '../types';

export function HomeScreen() {
  const { setCurrentScreen, setSelectedShooter, planInfo, setPlanInfo, setRecordsCache } = useApp();
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [selectedShooterId, setSelectedShooterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadShooters();
    loadPlanInfo();
  }, []);

  useEffect(() => {
    if (!loading && shooters.length > 0) {
      const savedShooterId = localStorage.getItem('lastSelectedShooterId');
      if (savedShooterId && shooters.some(s => s.id === savedShooterId)) {
        setSelectedShooterId(savedShooterId);
        const shooter = shooters.find(s => s.id === savedShooterId);
        setSelectedShooter(shooter || null);
      }
    }
  }, [loading, shooters, setSelectedShooter]);

  async function loadPlanInfo() {
    const info = await fetchPlanInfo();
    if (info) setPlanInfo(info);
    if (info && info.pending_plan_type && !info.stripe_subscription_id) {
      setCurrentScreen('payment-verification-failed');
    }
  }

  async function loadShooters() {
    try {
      const { data, error } = await supabase
        .from('shooters')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setShooters(data || []);
    } catch (error) {
      console.error('Error loading shooters:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleShooterSelect(shooterId: string) {
    setSelectedShooterId(shooterId);

    if (shooterId === 'new') {
      setSelectedShooter(null);
      localStorage.removeItem('lastSelectedShooterId');
    } else {
      const shooter = shooters.find(s => s.id === shooterId);
      setSelectedShooter(shooter || null);
      if (shooterId) {
        localStorage.setItem('lastSelectedShooterId', shooterId);
      }
    }
  }

  function handleNewRecord() {
    if (!selectedShooterId) {
      alert('Please select a shooter first');
      return;
    }

    if (selectedShooterId === 'new') {
      setCurrentScreen('new-shooter');
    } else {
      const shooter = shooters.find(s => s.id === selectedShooterId);
      setSelectedShooter(shooter || null);
      setCurrentScreen('new-record');
    }
  }

  function handleSettings() {
    if (!selectedShooterId || selectedShooterId === 'new') {
      alert('Please select an existing shooter first');
      return;
    }

    const shooter = shooters.find(s => s.id === selectedShooterId);
    setSelectedShooter(shooter || null);
    setCurrentScreen('settings');
  }

  function handlePreviousRecords() {
    if (!selectedShooterId || selectedShooterId === 'new') {
      alert('Please select an existing shooter first');
      return;
    }

    const shooter = shooters.find(s => s.id === selectedShooterId);
    setSelectedShooter(shooter || null);
    setRecordsCache(null);
    setCurrentScreen('previous-records');
  }

  const atShooterLimit = !!(
    planInfo &&
    !planInfo.unlimited &&
    planInfo.shooter_limit !== null &&
    planInfo.shooter_count >= planInfo.shooter_limit
  );

  const newShooterDisabled = atShooterLimit;

  function shouldShowUpgradeControl(): boolean {
    if (!planInfo) return false;
    if (planInfo.pending_plan_type === 'Free') return false;

    type ShowRule = boolean | (() => boolean);
    const rules: Record<string, ShowRule> = {
      Founder: false,
      Free: true,
      Monthly: true,
      Annual: true,
      Promotional: () => {
        if (!planInfo.expires_at) return false;
        const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
        return Date.now() >= new Date(planInfo.expires_at).getTime() - fifteenDaysMs;
      },
    };

    const rule = rules[planInfo.plan_type];
    if (rule === undefined) return false;
    return typeof rule === 'function' ? rule() : rule;
  }

  function getCancellationPendingText(): string | null {
    if (!planInfo || planInfo.pending_plan_type !== 'Free') return null;
    if (!planInfo.current_period_end) return `Cancellation scheduled — full ${planInfo.plan_type} access continues until your billing period ends.`;
    const date = new Date(planInfo.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `Cancellation scheduled — full ${planInfo.plan_type} access continues until ${date}.`;
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    const result = await createPortalSession();
    setPortalLoading(false);
    if (result.url) {
      window.location.href = result.url;
    } else {
      alert(result.error || 'Could not open billing portal. Please try again.');
    }
  }

  function getUpgradeLabel(): string {
    if (!planInfo) return 'Upgrade';
    const plan = planInfo.plan_type;
    if (plan === 'Monthly' || plan === 'Annual') return 'Modify Plan';
    return 'Upgrade';
  }

  function getPlanBannerText(): string {
    if (!planInfo) return '';
    const plan = planInfo.plan_type;
    if (plan === 'Free') {
      return `Free Plan — ${planInfo.shooter_count} of ${planInfo.shooter_limit} shooters used \u2022 ${planInfo.records_limit} range records per shooter \u2022 ${planInfo.settings_limit} settings per category`;
    }
    if (plan === 'Promotional' && planInfo.expires_at) {
      const expiresDate = new Date(planInfo.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `Promotional Plan — Unlimited access through ${expiresDate}`;
    }
    return '';
  }

  const showBanner = planInfo && (!planInfo.unlimited || planInfo.plan_type === 'Promotional');
  const showUpgradeControl = shouldShowUpgradeControl();
  const upgradeLabel = getUpgradeLabel();
  const cancellationPendingText = getCancellationPendingText();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
                <img src={LOGO_LIGHT} alt="Range Tracker Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Range Tracker</h1>
                <p className="text-slate-600">Track your shooting sessions</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Log out"
              onClick={() => { clearTenantCredentials(); window.location.reload(); }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          <div className="flex justify-end mb-4">
            <a
              href="https://rtapp.supabase.angrycow.tech/storage/v1/object/public/range-photos/Range%20Tracker%20User%20Guide%20Mobile%20Edition%20Ver_00_02_35.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: '#153050' }}
            >
              Get The Users Guide
            </a>
          </div>

          {showBanner && (
            <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm text-amber-800">{getPlanBannerText()}</span>
                {showUpgradeControl && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 bg-primary-900 hover:bg-primary-800"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {upgradeLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {cancellationPendingText && (
            <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-sm text-slate-600">{cancellationPendingText}</span>
            </div>
          )}

          {!showBanner && !cancellationPendingText && showUpgradeControl && (
            <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm text-slate-600">
                  {planInfo?.plan_type} Plan — Unlimited access
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(planInfo?.plan_type === 'Monthly' || planInfo?.plan_type === 'Annual') && (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      <CreditCard className="w-4 h-4" />
                      {portalLoading ? 'Loading...' : 'Manage Billing'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white px-3 py-1.5 rounded-lg transition-colors bg-primary-900 hover:bg-primary-800"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {upgradeLabel}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Create New Range Record</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="home-shooter-select" className="block text-sm font-medium text-slate-700 mb-2">
                    Select Shooter
                  </label>
                  {loading ? (
                    <div className="text-slate-500">Loading shooters...</div>
                  ) : (
                    <select
                      id="home-shooter-select"
                      value={selectedShooterId}
                      onChange={(e) => handleShooterSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent text-slate-900"
                      style={{ focusRingColor: '#093057' } as React.CSSProperties}
                    >
                      <option value="">-- Select Shooter --</option>
                      {!newShooterDisabled && <option value="new">New Shooter</option>}
                      {newShooterDisabled && (
                        <option value="new" disabled>
                          New Shooter (limit reached — upgrade to add more)
                        </option>
                      )}
                      {shooters.map((shooter) => (
                        <option key={shooter.id} value={shooter.id}>
                          {shooter.last_name}, {shooter.first_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleNewRecord}
                  disabled={!selectedShooterId}
                  className="w-full disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800"
                >
                  <Plus className="w-5 h-5" />
                  New Record
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-3">
              <button
                onClick={handleSettings}
                disabled={!selectedShooterId || selectedShooterId === 'new'}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>

              <button
                onClick={handlePreviousRecords}
                disabled={!selectedShooterId || selectedShooterId === 'new'}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <History className="w-5 h-5" />
                View Previous Records
              </button>
            </div>
          </div>
        </div>
      </div>

      {showUpgradeModal && planInfo && (
        <UpgradePlanModal
          currentPlan={planInfo.plan_type}
          onClose={() => { setShowUpgradeModal(false); loadPlanInfo(); }}
        />
      )}
    </div>
  );
}

