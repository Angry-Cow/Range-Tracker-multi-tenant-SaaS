import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Clock, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const REGISTER_URL = `${SUPABASE_URL}/functions/v1/register`;
const CHECKOUT_URL = `${SUPABASE_URL}/functions/v1/create-checkout-session`;
const ERROR_REPORT_URL = `${SUPABASE_URL}/functions/v1/send-error-report`;

type State = 'form' | 'pending' | 'approved' | 'redirecting-checkout' | 'checkout-error';

interface ApprovedInfo {
  slug: string;
  token: string;
}

interface Plan {
  id: string;
  plan_name: string;
  plan_price: string;
  token: string | null;
}

function getPasswordStrength(password: string): { label: string; color: string; met: boolean[] } {
  const met = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const count = met.filter(Boolean).length;
  if (count <= 2) return { label: 'Weak', color: 'text-red-600', met };
  if (count <= 3) return { label: 'Fair', color: 'text-yellow-600', met };
  if (count === 4) return { label: 'Good', color: 'text-blue-600', met };
  return { label: 'Strong', color: 'text-green-600', met };
}

function toSiteName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
}

export function RegisterPage() {
  const [state, setState] = useState<State>('form');
  const [approvedInfo, setApprovedInfo] = useState<ApprovedInfo | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [organization, setOrganization] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteNameTouched, setSiteNameTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutErrorStep, setCheckoutErrorStep] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${REGISTER_URL}/plans`, {
          headers: { 'Apikey': SUPABASE_ANON_KEY },
        });
        const result = await res.json();
        if (result.data) setPlans(result.data);
      } catch {
        // silently fail; form validation will catch empty plan
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const selectedPlanObj = plans.find((p) => p.id === selectedPlan) ?? null;
  const requiresInvitationCode = selectedPlanObj?.token !== null && selectedPlanObj?.token !== undefined;

  const strength = getPasswordStrength(password);

  const siteNameError = siteNameTouched && siteName.length < 2
    ? 'Site name must be at least 2 characters.'
    : null;

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedPlan(e.target.value);
    setInvitationCode('');
    setError('');
  }

  function resetToForm() {
    setState('form');
    setShowReportModal(false);
    setReportDescription('');
    setReportSubmitted(false);
    setCheckoutError('');
    setCheckoutErrorStep('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSiteNameTouched(true);

    if (siteName.length < 2) {
      setError('Site name must be at least 2 characters.');
      return;
    }

    if (!selectedPlan) {
      setError('Please select a plan.');
      return;
    }

    if (requiresInvitationCode && !invitationCode.trim()) {
      setError('This plan requires an Invitation Code.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }


    setLoading(true);

    try {
      const body: Record<string, string> = {
        name,
        email,
        organization,
        site_name: siteName,
        password,
        plan_id: selectedPlan,
      };

      if (requiresInvitationCode && invitationCode.trim()) {
        body.promo_code = invitationCode.trim();
      }

      const res = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.tokenError) {
        setCheckoutError(result.tokenError);
        setState('checkout-error');
        return;
      }

      if (result.data.status === 'active') {
        localStorage.setItem('tenantSlug', result.data.slug);
        localStorage.setItem('tenantToken', result.data.token);
        setApprovedInfo({ slug: result.data.slug, token: result.data.token });

        const isPaidPlanSelected = selectedPlanObj && ['Monthly', 'Annual'].includes(selectedPlanObj.plan_name);
        if (isPaidPlanSelected) {
          setState('redirecting-checkout');
          try {
            const checkoutRes = await fetch(CHECKOUT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.data.token}`,
                'Apikey': SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ plan_type: selectedPlanObj!.plan_name }),
            });
            const checkoutResult = await checkoutRes.json();
            if (checkoutResult.data?.url) {
              sessionStorage.setItem('pendingPlanType', selectedPlanObj!.plan_name);
              sessionStorage.setItem('pendingName', name);
              sessionStorage.setItem('pendingEmail', email);
              window.location.href = checkoutResult.data.url;
              return;
            }
            const errMsg = checkoutResult.error ?? 'No checkout URL returned.';
            setCheckoutError(errMsg);
            setCheckoutErrorStep(checkoutResult.errorStep ?? 'create-checkout-session: unknown step');
            setState('checkout-error');
          } catch (err) {
            setCheckoutError(String(err));
            setCheckoutErrorStep('create-checkout-session: fetch failed');
            setState('checkout-error');
          }
        } else {
          setState('approved');
        }
      } else {
        setState('pending');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReportSubmitting(true);
    setReportError('');
    try {
      const res = await fetch(ERROR_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          name,
          email,
          description: reportDescription,
          internalError: checkoutError,
          errorStep: checkoutErrorStep,
          source: 'register',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data?.persisted) {
        setReportError(
          json?.error ||
            'We could not record your report. Please email info@rangetracker.net directly.',
        );
        return;
      }
      setReportSubmitted(true);
      setTimeout(() => {
        resetToForm();
      }, 2000);
    } catch (err) {
      setReportError(
        (err instanceof Error ? err.message : 'Network error') +
          '. Please email info@rangetracker.net directly.',
      );
    } finally {
      setReportSubmitting(false);
    }
  }

  function goToApp() {
    window.location.href = '/';
  }

  if (state === 'redirecting-checkout') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f0f8' }}>
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#093057', borderTopColor: 'transparent' }} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Account Created!</h2>
          <p className="text-slate-600">Redirecting you to secure payment to activate your plan...</p>
        </div>
      </div>
    );
  }

  if (state === 'checkout-error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Connection Problem</h2>
          <p className="text-slate-600 mb-6">
            There was a connection problem reaching our payment provider. Your account has been created but your plan has not been activated yet.
          </p>
          <p className="text-slate-500 text-sm mb-4">
            Please report this error so we can investigate and manually activate your plan.
          </p>
          {(checkoutError || checkoutErrorStep) && (
            <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-2">
              {checkoutErrorStep && (
                <p className="text-xs font-mono text-slate-500">
                  <span className="font-semibold text-slate-700">Step: </span>{checkoutErrorStep}
                </p>
              )}
              {checkoutError && (
                <p className="text-xs font-mono text-red-700 break-all">
                  <span className="font-semibold">Error: </span>{checkoutError}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full text-white font-semibold py-3 rounded-lg transition-colors mb-3 bg-primary-900 hover:bg-primary-800"
          >
            Report Issue
          </button>
          <button
            onClick={resetToForm}
            className="w-full text-slate-600 font-medium py-2 rounded-lg transition-colors hover:bg-slate-100"
          >
            Back to Registration
          </button>
        </div>

        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              {reportSubmitted ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Report Sent</h3>
                  <p className="text-slate-600 text-sm">Thank you. We'll be in touch shortly to activate your account.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Report Issue</h3>
                    <button
                      onClick={resetToForm}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleReportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={name}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Brief Description <span className="text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900 resize-none"
                        placeholder="Describe what happened, if anything unusual..."
                      />
                    </div>
                    {reportError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {reportError}
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setReportError(''); resetToForm(); }}
                        className="flex-1 text-slate-600 font-medium py-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={reportSubmitting}
                        className="flex-1 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
                      >
                        {reportSubmitting ? 'Sending...' : 'Submit Report'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state === 'approved' && approvedInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Granted</h2>
          <p className="text-slate-600 mb-6">
            Your Range Tracker account is ready. Your instance is at:
          </p>
          <div className="bg-slate-100 rounded-lg px-4 py-3 mb-6 font-mono text-sm text-slate-700 break-all">
            /t/{approvedInfo.slug}/
          </div>
          <button
            onClick={goToApp}
            className="w-full text-white font-semibold py-3 rounded-lg transition-colors bg-primary-900 hover:bg-primary-800"
          >
            Open Range Tracker
          </button>
        </div>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Received</h2>
          <p className="text-slate-600 mb-4">
            Your registration request has been submitted. An administrator will review your request and approve your account.
          </p>
          <p className="text-slate-500 text-sm">
            You will be notified at <strong>{email}</strong> when your account is approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center p-2" style={{ backgroundColor: '#093057' }}>
            <img src="/SASS_Favicon_Cropped_Smaller.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Request Access</h1>
            <p className="text-slate-500 text-sm">Range Tracker Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Plan *
            </label>
            <select
              value={selectedPlan}
              onChange={handlePlanChange}
              required
              disabled={plansLoading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900 bg-white disabled:opacity-60"
            >
              <option value="">
                {plansLoading ? 'Loading plans...' : 'Select a plan'}
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name} - {plan.plan_price}
                </option>
              ))}
            </select>
          </div>

          {requiresInvitationCode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invitation Code *
              </label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => { setInvitationCode(e.target.value); setError(''); }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900 font-mono tracking-widest"
                placeholder="Enter your invitation code"
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Organization / Club
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Name *
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => {
                setSiteName(toSiteName(e.target.value));
                setSiteNameTouched(true);
              }}
              onBlur={() => setSiteNameTouched(true)}
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none text-slate-900 font-mono ${
                siteNameError ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
              placeholder="my-club"
              maxLength={63}
            />
            {siteNameError && (
              <p className="text-xs text-red-600 mt-1">{siteNameError}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Strength:</span>
                  <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
                </div>
                <ul className="text-xs space-y-0.5">
                  {[
                    'At least 8 characters',
                    'One uppercase letter',
                    'One lowercase letter',
                    'One number',
                    'One special character',
                  ].map((req, i) => (
                    <li key={i} className={strength.met[i] ? 'text-green-600' : 'text-slate-400'}>
                      {strength.met[i] ? '✓' : '○'} {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:outline-none text-slate-900 ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300'
                }`}
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => { setError(''); setInvitationCode(''); setSelectedPlan(''); }}
                  className="shrink-0 text-xs font-medium text-red-600 border border-red-300 rounded px-2 py-0.5 hover:bg-red-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary-900 hover:bg-primary-800"
          >
            <UserPlus className="w-5 h-5" />
            {loading ? 'Submitting...' : 'Request Access'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have access?{' '}
          <a href="/" className="font-medium" style={{ color: '#093057' }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
