import { useApp } from '../contexts/AppContext';
import { hasTenantCredentials, fetchPlanInfo } from '../lib/apiClient';

export function SplashScreen() {
  const { setCurrentScreen, setPlanInfo } = useApp();

  async function handleGetStarted() {
    if (!hasTenantCredentials()) {
      setCurrentScreen('login');
      return;
    }
    const info = await fetchPlanInfo();
    if (info) setPlanInfo(info);
    if (info && info.pending_plan_type && !info.stripe_subscription_id) {
      setCurrentScreen('payment-verification-failed');
      return;
    }
    setCurrentScreen('home');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#153050' }}>
      <div className="text-center -mt-5">
        <div className="mb-4 flex justify-center">
          <img src="/Range_Tracker_Approved_Logo_for_Dark_BG.png" alt="Range Tracker Logo" className="w-72 h-72 object-contain" />
        </div>

        <h1 className="text-white text-3xl font-bold mb-3 leading-snug">
          Welcome to<br />Range Tracker&#8482;
        </h1>
        <p className="text-white/80 text-base mb-8 leading-relaxed">
          Click the button below<br />to create an account or log in
        </p>

        <button
          type="button"
          onClick={handleGetStarted}
          className="px-12 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-white mb-8"
          style={{ backgroundColor: '#153050', border: '2px solid white' }}
        >
          Get Started
        </button>

        <p className="text-white/90 text-lg">Ver. 00.02.35</p>
      </div>
    </div>
  );
}
