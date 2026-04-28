import { useState } from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createCheckoutSession } from '../lib/apiClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const ERROR_REPORT_URL = `${SUPABASE_URL}/functions/v1/send-error-report`;

export function PaymentCancelledScreen() {
  const { setCurrentScreen } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const storedPlan = sessionStorage.getItem('pendingPlanType') || '';
  const storedName = sessionStorage.getItem('pendingName') || '';
  const storedEmail = sessionStorage.getItem('pendingEmail') || '';

  function clearUrlParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_cancelled');
    window.history.replaceState({}, '', url.toString());
  }

  function handleGoToApp() {
    clearUrlParams();
    sessionStorage.removeItem('pendingPlanType');
    sessionStorage.removeItem('pendingName');
    sessionStorage.removeItem('pendingEmail');
    setCurrentScreen('home');
  }

  async function handleRetry() {
    if (!storedPlan) {
      setRetryError('Could not determine your plan. Please try again from the Settings screen.');
      return;
    }
    setRetrying(true);
    setRetryError('');
    clearUrlParams();
    const result = await createCheckoutSession(storedPlan);
    if (result.error || !result.url) {
      setRetryError(result.error || 'Failed to start checkout. Please try again.');
      setRetrying(false);
      return;
    }
    window.location.href = result.url;
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
          name: storedName,
          email: storedEmail,
          description: reportDescription,
          internalError: 'Stripe checkout page refused to connect or user was returned without completing payment.',
          errorStep: 'stripe-checkout: payment page failed to load / connection refused',
          source: 'payment-cancelled',
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
        setShowReportModal(false);
        setReportSubmitted(false);
        setReportDescription('');
      }, 2500);
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Not Completed</h2>
        <p className="text-slate-600 mb-3">
          The payment page could not be reached, or you returned before completing your purchase. Your account is active but your paid plan has not been activated.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          If you experienced a connection error (e.g. "refused to connect"), please report it so we can investigate and manually activate your plan.
        </p>

        <div className="space-y-3">
          {storedPlan && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 bg-primary-900 hover:bg-primary-800"
            >
              <RefreshCw className="w-5 h-5" />
              {retrying ? 'Opening payment page...' : 'Try Payment Again'}
            </button>
          )}

          <button
            onClick={() => setShowReportModal(true)}
            className="w-full font-semibold py-3 rounded-lg border-2 transition-colors"
            style={{ borderColor: '#093057', color: '#093057' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0f4f8'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Report Connection Issue
          </button>

          <button
            onClick={handleGoToApp}
            className="w-full text-slate-500 font-medium py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
          >
            Continue to App (Free Plan)
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
                <p className="text-slate-600 text-sm">Thank you. We'll investigate and be in touch shortly to activate your plan.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Report Connection Issue</h3>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleReportSubmit} className="space-y-4">
                  {storedName && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={storedName}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                  )}
                  {storedEmail && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={storedEmail}
                        readOnly
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Brief Description <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={reportDescription}
                      onChange={e => setReportDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:outline-none text-slate-900 resize-none"
                      placeholder="Describe what you saw — e.g. 'connection refused', blank page, etc."
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
