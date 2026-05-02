import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { verifyTenantPassword, changePlan, fetchPlanInfo, createCheckoutSession } from '../lib/apiClient';
import { useApp } from '../contexts/AppContext';

interface UpgradePlanModalProps {
  currentPlan: string;
  onClose: () => void;
}

type Step = 'verify-password' | 'select-plan' | 'downgrade-warning' | 'redirecting' | 'success';

const PLAN_DETAILS: Record<string, { price: string; description: string; billing: string }> = {
  Monthly: { price: '$3.99', description: 'Unlimited shooters, records, and settings.', billing: 'Billed monthly' },
  Annual: { price: '$39.99', description: 'Unlimited shooters, records, and settings.', billing: 'Billed annually — save over 16%' },
  Free: { price: '$0.00', description: 'Up to 2 shooters, 20 range records per shooter, 5 settings per category.', billing: 'Always free' },
};

const PAID_PLANS = ['Monthly', 'Annual'];
const isPaidPlan = (plan: string) => PAID_PLANS.includes(plan);

export function UpgradePlanModal({ currentPlan, onClose }: UpgradePlanModalProps) {
  const { setPlanInfo, planInfo } = useApp();
  const [step, setStep] = useState<Step>('verify-password');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isModify = isPaidPlan(currentPlan);
  const availablePlans = isModify
    ? ['Monthly', 'Annual', 'Free'].filter(p => p !== currentPlan)
    : PAID_PLANS;

  async function handleVerifyPassword() {
    if (!password) {
      setPasswordError('Please enter your account password.');
      return;
    }
    setVerifying(true);
    setPasswordError('');
    const result = await verifyTenantPassword(password);
    setVerifying(false);
    if (!result.verified) {
      setPasswordError(result.error || 'Incorrect password. Please try again.');
      return;
    }
    setStep('select-plan');
  }

  function handleSelectPlan(plan: string) {
    setSelectedPlan(plan);
    if (plan === 'Free') {
      setStep('downgrade-warning');
    } else {
      handleCheckout(plan);
    }
  }

  async function handleCheckout(plan: string) {
    setSubmitting(true);
    setSubmitError('');
    setStep('redirecting');
    const result = await createCheckoutSession(plan);
    if (result.error || !result.url) {
      setSubmitError(result.error || 'Failed to start checkout. Please try again.');
      setStep('select-plan');
      setSubmitting(false);
      return;
    }
    sessionStorage.setItem('pendingPlanType', plan);
    if (planInfo?.name) sessionStorage.setItem('pendingName', planInfo.name);
    if (planInfo?.email) sessionStorage.setItem('pendingEmail', planInfo.email);
    window.location.href = result.url;
  }

  async function handleConfirmChange(plan?: string) {
    const target = plan ?? selectedPlan;
    setSubmitting(true);
    setSubmitError('');
    const result = await changePlan(target);
    if (result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }
    const updatedInfo = await fetchPlanInfo();
    if (updatedInfo) setPlanInfo(updatedInfo);
    setSubmitting(false);
    setStep('success');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {isModify ? 'Modify Plan' : 'Upgrade Your Plan'}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'verify-password' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                To change your plan, please confirm your account password.
              </p>
              <div>
                <label htmlFor="upgrade-modal-password" className="block text-sm font-medium text-slate-700 mb-1">Account Password</label>
                <input
                  id="upgrade-modal-password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyPassword(); }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2"
                  style={{ focusRingColor: '#093057' } as React.CSSProperties}
                  placeholder="Enter your password"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-700">{passwordError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleVerifyPassword}
                disabled={verifying}
                className="w-full text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 bg-primary-900 hover:bg-primary-800"
              >
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          )}

          {step === 'select-plan' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Your current plan: <span className="font-semibold">{currentPlan}</span>. Select a new plan below.
              </p>
              <div className="space-y-3">
                {availablePlans.map(plan => {
                  const details = PLAN_DETAILS[plan];
                  return (
                    <button
                      key={plan}
                      type="button"
                      aria-label={`Select ${plan} plan`}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={submitting}
                      className="w-full text-left border-2 border-slate-200 hover:border-slate-400 rounded-xl p-4 transition-all disabled:opacity-60 hover:bg-[#f0f4f8]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{plan}</span>
                        <span className="text-lg font-bold" style={{ color: '#093057' }}>{details.price}</span>
                      </div>
                      <p className="text-xs text-slate-500">{details.billing}</p>
                      <p className="text-sm text-slate-600 mt-1">{details.description}</p>
                    </button>
                  );
                })}
              </div>
              {submitError && <p className="text-sm text-red-700">{submitError}</p>}
            </div>
          )}

          {step === 'redirecting' && (
            <div className="text-center space-y-4 py-6">
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f0f8' }}>
                <ExternalLink className="w-7 h-7" style={{ color: '#093057' }} />
              </div>
              <p className="text-lg font-semibold text-slate-900">Redirecting to secure payment...</p>
              <p className="text-sm text-slate-500">
                You will be taken to Stripe to complete your purchase safely.
              </p>
              <div className="flex justify-center">
                <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#093057', borderTopColor: 'transparent' }} />
              </div>
            </div>
          )}

          {step === 'downgrade-warning' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 space-y-2">
                  <p className="font-semibold">Downgrading to Free Plan</p>
                  <p>
                    Your subscription will be cancelled at the end of your current billing period.
                    <strong> You will keep full {currentPlan} access until then</strong> — no immediate changes to your account.
                  </p>
                  <p>
                    When the Free plan takes effect, your existing Range Records, Shooters, and Settings will <strong>not</strong> be deleted.
                    You will be able to create <strong>20 more Range Records</strong> per shooter beyond your count at that time.
                    Your existing shooters and settings will remain intact.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('select-plan')}
                  disabled={submitting}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmChange()}
                  disabled={submitting}
                  className="flex-1 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#b91c1c' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#991b1b'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                >
                  {submitting ? 'Processing...' : 'Confirm Downgrade'}
                </button>
              </div>
              {submitError && <p className="text-sm text-red-700">{submitError}</p>}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 mx-auto" style={{ color: '#16a34a' }} />
              <p className="text-lg font-semibold text-slate-900">Cancellation Scheduled</p>
              <p className="text-sm text-slate-600">
                Your {currentPlan} subscription has been cancelled.{' '}
                {planInfo?.current_period_end
                  ? <>Your full access continues until <span className="font-semibold">{new Date(planInfo.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>, after which the Free plan will take effect.</>
                  : 'Your full access continues until the end of your current billing period, after which the Free plan will take effect.'
                }
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-white font-semibold py-3 rounded-lg transition-colors bg-primary-900 hover:bg-primary-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
