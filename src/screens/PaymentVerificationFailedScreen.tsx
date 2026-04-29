import { useState } from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw, LogOut } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { clearTenantCredentials, createCheckoutSession, fetchPlanInfo } from '../lib/apiClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const ERROR_REPORT_URL = `${SUPABASE_URL}/functions/v1/send-error-report`;

export function PaymentVerificationFailedScreen() {
  const { setCurrentScreen, planInfo, setPlanInfo } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportName, setReportName] = useState(sessionStorage.getItem('pendingName') || '');
  const [reportEmail, setReportEmail] = useState(sessionStorage.getItem('pendingEmail') || '');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const pendingPlan =
    planInfo?.pending_plan_type ||
    sessionStorage.getItem('pendingPlanType') ||
    '';

  function clearUrlParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_success');
    url.searchParams.delete('payment_cancelled');
    url.searchParams.delete('session_id');
    url.searchParams.delete('plan');
    window.history.replaceState({}, '', url.toString());
  }

  async function handleRetry() {
    if (!pendingPlan) {
      setRetryError('Could not determine your plan. Please contact support.');
      return;
    }
    setRetrying(true);
    setRetryError('');
    clearUrlParams();
    const result = await createCheckoutSession(pendingPlan);
    if (result.error || !result.url) {
      setRetryError(result.error || 'Failed to start checkout. Please try again or report the issue.');
      setRetrying(false);
      return;
    }
    sessionStorage.setItem('pendingPlanType', pendingPlan);
    if (reportName) sessionStorage.setItem('pendingName', reportName);
    if (reportEmail) sessionStorage.setItem('pendingEmail', reportEmail);
    window.location.href = result.url;
  }

  function handleCancelAndSignOut() {
    clearUrlParams();
    clearTenantCredentials();
    sessionStorage.removeItem('pendingPlanType');
    sessionStorage.removeItem('pendingName');
    sessionStorage.removeItem('pendingEmail');
    setPlanInfo(null);
    setCurrentScreen('login');
  }

  async function handleRefreshCheck() {
    setRetrying(true);
    const info = await fetchPlanInfo();
    if (info) {
      setPlanInfo(info);
      if (info.stripe_subscription_id && (info.plan_type === 'Monthly' || info.plan_type === 'Annual')) {
        clearUrlParams();
        setCurrentScreen('home');
        setRetrying(false);
        return;
      }
    }
    setRetrying(false);
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
          name: reportName,
          email: reportEmail,
          description: reportDescription,
          internalError: `Payment was not verified. pending_plan_type=${pendingPlan}, stripe_subscription_id=${planInfo?.stripe_subscription_id ?? 'null'}, stripe_subscription_status=${planInfo?.stripe_subscription_status ?? 'null'}, payment_attempt_started_at=${planInfo?.payment_attempt_started_at ?? 'null'}`,
          errorStep: 'payment-verification: Stripe subscription not confirmed after checkout redirect',
          source: 'payment-verification-failed',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data?.persisted) {
        setReportError(
          json?.error ||
            'We could not record your report. Please email info@rangetracker.net directly and include your name and what happened.',
        );
        return;
      }
      setReportSubmitted(true);
    } catch (err) {
      setReportError(
        (err instanceof Error ? err.message : 'Network error') +
          '. Please email info@rangetracker.net directly.',
      );
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Not Verified</h2>
        <p className="text-slate-600 mb-3">
          Your account was created, but we were unable to confirm your payment for the
          {pendingPlan ? ` ${pendingPlan} ` : ' '}plan. The secure payment page may have been
          unreachable (e.g. "refused to connect") or the transaction was not completed.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          For your protection, access to the app is paused until payment is verified.
          You can retry payment, report the problem, or cancel this request.
        </p>

        <div className="space-y-3">
          {pendingPlan && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 bg-primary-900 hover:bg-primary-800"
            >
              <RefreshCw className="w-5 h-5" />
              {retrying ? 'Opening payment page...' : 'Retry Payment'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="w-full font-semibold py-3 rounded-lg border-2 transition-colors"
            style={{ borderColor: '#093057', color: '#093057' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0f4f8'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Report the Issue
          </button>

          <button
            type="button"
            onClick={handleRefreshCheck}
            disabled={retrying}
            className="w-full text-slate-600 font-medium py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm disabled:opacity-60"
          >
            {retrying ? 'Checking...' : 'I Just Paid - Re-check Status'}
          </button>

          <button
            type="button"
            onClick={handleCancelAndSignOut}
            className="w-full text-slate-500 font-medium py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cancel Request and Sign Out
          </button>
        </div>

        {retryError && (
          <p className="mt-4 text-sm text-red-600">{retryError}</p>
        )}
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
                <p className="text-slate-600 text-sm">
                  Thank you. A member of the Range Tracker team will contact you shortly
                  to investigate the problem and activate your plan manually if appropriate.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportSubmitted(false); setReportDescription(''); }}
                  className="w-full text-white font-semibold py-3 rounded-lg transition-colors"
                  style={{ backgroundColor: '#093057' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Report the Issue</h3>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setShowReportModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleReportSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="pvf-report-name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      id="pvf-report-name"
                      type="text"
                      value={reportName}
                      onChange={e => setReportName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="pvf-report-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      id="pvf-report-email"
                      type="email"
                      value={reportEmail}
                      onChange={e => setReportEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="pvf-report-description" className="block text-sm font-medium text-slate-700 mb-1">
                      What happened? <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="pvf-report-description"
                      value={reportDescription}
                      onChange={e => setReportDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900 resize-none"
                      placeholder="e.g. 'the payment page said refused to connect'"
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
                      onClick={() => { setShowReportModal(false); setReportError(''); }}
                      className="flex-1 text-slate-600 font-medium py-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportSubmitting}
                      className="flex-1 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 bg-primary-900 hover:bg-primary-800"
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
