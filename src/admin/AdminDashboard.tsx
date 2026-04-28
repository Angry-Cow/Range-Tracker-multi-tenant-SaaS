import { useState, useEffect } from 'react';
import { Users, ClipboardList, LogOut, RefreshCw, CheckCircle, XCircle, PauseCircle, Trash2, Shield, Mail, KeyRound } from 'lucide-react';
import {
  fetchTenants,
  fetchRegistrations,
  fetchPlans,
  approveTenant,
  rejectTenant,
  suspendTenant,
  deleteTenant,
  resendApprovalEmail,
  setTenantPlan,
  clearAdminToken,
  changeAdminPassword,
} from './api';

interface Tenant {
  id: string;
  name: string;
  email: string;
  organization: string;
  slug: string;
  site_name: string;
  plan_type: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  created_at: string;
  approved_at: string | null;
}

interface Plan {
  id: string;
  plan_name: string;
  plan_price: string;
  plan_description: string;
}

type Tab = 'tenants' | 'registrations';

interface Props {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [registrations, setRegistrations] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tenant | null>(null);
  const [error, setError] = useState('');
  const [planSelections, setPlanSelections] = useState<Record<string, string>>({});
  const [planSaving, setPlanSaving] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [tenantsRes, regsRes, plansRes] = await Promise.all([fetchTenants(), fetchRegistrations(), fetchPlans()]);
      if (tenantsRes.error) throw new Error(tenantsRes.error);
      if (regsRes.error) throw new Error(regsRes.error);
      const loadedTenants: Tenant[] = tenantsRes.data || [];
      setTenants(loadedTenants);
      setRegistrations(regsRes.data || []);
      setPlans(plansRes.data || []);
      const selections: Record<string, string> = {};
      for (const t of loadedTenants) {
        selections[t.id] = t.plan_type || 'Free';
      }
      setPlanSelections(selections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPlan(tenant: Tenant) {
    const selected = planSelections[tenant.id];
    if (!selected || selected === tenant.plan_type) return;
    setPlanSaving(tenant.id);
    try {
      const result = await setTenantPlan(tenant.id, selected);
      if (result.error) throw new Error(result.error);
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, plan_type: selected } : t));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set plan');
    } finally {
      setPlanSaving(null);
    }
  }

  async function handleApprove(tenant: Tenant) {
    setActionId(tenant.id);
    try {
      const result = await approveTenant(tenant.id);
      if (result.error) throw new Error(result.error);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(tenant: Tenant) {
    setActionId(tenant.id);
    try {
      const result = await rejectTenant(tenant.id);
      if (result.error) throw new Error(result.error);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleSuspend(tenant: Tenant) {
    setActionId(tenant.id);
    try {
      const result = await suspendTenant(tenant.id);
      if (result.error) throw new Error(result.error);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleResendEmail(tenant: Tenant) {
    setActionId(tenant.id);
    try {
      const result = await resendApprovalEmail(tenant.id);
      if (result.error) throw new Error(result.error);
      alert(`Approval email resent to ${tenant.email}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(tenant: Tenant) {
    setActionId(tenant.id);
    setConfirmDelete(null);
    try {
      const result = await deleteTenant(tenant.id);
      if (result.error) throw new Error(result.error);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  function handleLogout() {
    clearAdminToken();
    onLogout();
  }

  function openChangePassword() {
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwError('');
    setPwSuccess(false);
    setShowChangePassword(true);
  }

  async function handleChangePassword() {
    setPwError('');
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('All fields are required.');
      return;
    }
    if (pwNew.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const result = await changeAdminPassword(pwCurrent, pwNew);
      if (result.error) {
        setPwError(result.error);
      } else {
        setPwSuccess(true);
        setTimeout(() => setShowChangePassword(false), 1500);
      }
    } catch {
      setPwError('Failed to change password. Please try again.');
    } finally {
      setPwSaving(false);
    }
  }

  const statusBadge = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f4f8' }}>
      <header className="shadow-sm" style={{ backgroundColor: '#093057' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-lg">Range Tracker Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openChangePassword}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
            >
              <KeyRound className="w-4 h-4" />
              Change Password
            </button>
            <span className="text-white/30">|</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{tenants.filter(t => t.status === 'active').length}</div>
              <div className="text-sm text-slate-500 mt-1">Active Tenants</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-yellow-600">{registrations.length}</div>
              <div className="text-sm text-slate-500 mt-1">Pending Approvals</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{tenants.length}</div>
              <div className="text-sm text-slate-500 mt-1">Total Tenants</div>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setTab('tenants')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === 'tenants'
                  ? 'border-current text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              style={tab === 'tenants' ? { borderColor: '#093057', color: '#093057' } : {}}
            >
              <Users className="w-4 h-4" />
              Active Tenants
            </button>
            <button
              onClick={() => setTab('registrations')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 relative ${
                tab === 'registrations'
                  ? 'border-current text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              style={tab === 'registrations' ? { borderColor: '#093057', color: '#093057' } : {}}
            >
              <ClipboardList className="w-4 h-4" />
              Registration Requests
              {registrations.length > 0 && (
                <span className="ml-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {registrations.length}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : tab === 'tenants' ? (
            <div className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No tenants yet.</div>
              ) : (
                tenants.map((tenant) => (
                  <div key={tenant.id} className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{tenant.name}</span>
                        {statusBadge(tenant.status)}
                      </div>
                      <div className="text-sm text-slate-500 space-x-3">
                        <span>{tenant.email}</span>
                        {tenant.organization && <span>· {tenant.organization}</span>}
                        <span>· <code className="bg-slate-100 px-1 rounded text-xs">/t/{tenant.slug}/</code></span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Registered {new Date(tenant.created_at).toLocaleDateString()}
                        {tenant.approved_at && ` · Approved ${new Date(tenant.approved_at).toLocaleDateString()}`}
                      </div>
                      {plans.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 font-medium">Plan:</span>
                          <select
                            value={planSelections[tenant.id] || tenant.plan_type || 'Free'}
                            onChange={(e) => setPlanSelections(prev => ({ ...prev, [tenant.id]: e.target.value }))}
                            disabled={planSaving === tenant.id}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                          >
                            {plans.map(p => (
                              <option key={p.id} value={p.plan_name}>{p.plan_name} — {p.plan_price}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSetPlan(tenant)}
                            disabled={planSaving === tenant.id || planSelections[tenant.id] === tenant.plan_type}
                            className="text-xs px-3 py-1 rounded font-medium text-white transition-colors disabled:opacity-40 bg-primary-900 hover:bg-primary-800"
                          >
                            {planSaving === tenant.id ? 'Saving...' : 'Set'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.status === 'active' && (
                        <button
                          onClick={() => handleResendEmail(tenant)}
                          disabled={actionId === tenant.id}
                          title="Resend approval email"
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Mail className="w-5 h-5" />
                        </button>
                      )}
                      {tenant.status === 'active' && (
                        <button
                          onClick={() => handleSuspend(tenant)}
                          disabled={actionId === tenant.id}
                          title="Suspend"
                          className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <PauseCircle className="w-5 h-5" />
                        </button>
                      )}
                      {tenant.status === 'suspended' && (
                        <button
                          onClick={() => handleApprove(tenant)}
                          disabled={actionId === tenant.id}
                          title="Reactivate"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(tenant)}
                        disabled={actionId === tenant.id}
                        title="Delete permanently"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {registrations.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No pending registrations.</div>
              ) : (
                registrations.map((tenant) => (
                  <div key={tenant.id} className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 mb-1">{tenant.name}</div>
                      <div className="text-sm text-slate-500 space-x-3">
                        <span>{tenant.email}</span>
                        {tenant.organization && <span>· {tenant.organization}</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Requested {new Date(tenant.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(tenant)}
                        disabled={actionId === tenant.id}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 bg-primary-900 hover:bg-primary-800"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(tenant)}
                        disabled={actionId === tenant.id}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Change Admin Password</h2>
            <p className="text-sm text-slate-500 mb-5">Enter your current password and choose a new one.</p>

            {pwSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center font-medium">
                Password changed successfully!
              </div>
            ) : (
              <>
                {pwError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {pwError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Repeat new password"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="flex-1 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#093057' }}
                  >
                    {pwSaving ? 'Saving...' : 'Update Password'}
                  </button>
                  <button
                    onClick={() => setShowChangePassword(false)}
                    disabled={pwSaving}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Tenant</h2>
            <p className="text-slate-600 mb-2 text-sm">
              This will permanently delete <strong>{confirmDelete.name}</strong> and all their data including all shooters, records, and photos. This cannot be undone.
            </p>
            <p className="text-red-600 text-sm font-medium mb-6">Tenant: /t/{confirmDelete.slug}/</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Delete Permanently
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold transition-colors"
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
