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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#093057' }}>
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl p-4">
            <img src="/SASS_Favicon_Cropped_Smaller.png" alt="Range Tracker Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-white mb-4">Range Tracker</h1>

        <p className="text-white/90 text-lg mb-12">Ver. 00.02.35</p>

        <button
          type="button"
          onClick={handleGetStarted}
          className="px-12 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-white"
          style={{ backgroundColor: '#093057', border: '2px solid white' }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
