import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { fetchPlanInfo } from '../lib/apiClient';

export function PaymentSuccessScreen() {
  const { setCurrentScreen, setPlanInfo } = useApp();
  const [planType, setPlanType] = useState<string>('');
  const [confirming, setConfirming] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan') || '';
    setPlanType(planParam);
    confirmPlan(planParam);
  }, []);

  async function confirmPlan(planParam: string) {
    setConfirming(true);
    let resolvedPlan = planParam;
    for (let i = 0; i < 15; i++) {
      setAttempts(i + 1);
      const info = await fetchPlanInfo();
      if (
        info &&
        info.stripe_subscription_id &&
        (info.plan_type === 'Monthly' || info.plan_type === 'Annual')
      ) {
        resolvedPlan = info.plan_type;
        setPlanType(resolvedPlan);
        setPlanInfo(info);
        setConfirming(false);
        return;
      }
      if (i < 14) await new Promise(r => setTimeout(r, 3000));
    }
    const finalInfo = await fetchPlanInfo();
    if (finalInfo) setPlanInfo(finalInfo);
    setConfirming(false);
    setCurrentScreen('payment-verification-failed');
  }

  function handleGoToApp() {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_success');
    url.searchParams.delete('session_id');
    url.searchParams.delete('plan');
    window.history.replaceState({}, '', url.toString());
    setCurrentScreen('home');
  }

  const billingLabel = planType === 'Annual' ? 'billed annually' : 'billed monthly';
  const priceLabel = planType === 'Annual' ? '$39.99 / year' : '$3.99 / month';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#5e5e5e' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {confirming ? (
          <div className="space-y-4 py-6">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f0f8' }}>
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#093057', borderTopColor: 'transparent' }} />
            </div>
            <p className="text-lg font-semibold text-slate-900">Confirming your plan...</p>
            <p className="text-sm text-slate-500">
              {attempts < 8
                ? 'Just a moment while we confirm your payment.'
                : 'Almost there, hang tight...'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#16a34a' }} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful</h1>
              <p className="text-slate-600">
                Thank you for choosing Range Tracker to help document your range activities.
              </p>
            </div>

            {planType && (
              <div className="rounded-xl p-4 border border-slate-200 bg-slate-50 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-900">{planType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{priceLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Billing</span>
                  <span className="font-semibold text-slate-900 capitalize">{billingLabel}</span>
                </div>
              </div>
            )}

            <div className="text-sm text-slate-500">
              You now have unlimited shooters, range records, and settings. A receipt has been sent to your email.
            </div>

            <button
              onClick={handleGoToApp}
              className="w-full text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800"
            >
              Go to My Account
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
