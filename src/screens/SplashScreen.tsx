import { useApp } from '../contexts/AppContext';
import { hasTenantCredentials, fetchPlanInfo } from '../lib/apiClient';
import { LOGO_DARK } from '../assets/logos';

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
          <img src={LOGO_DARK} alt="Range Tracker Logo" className="w-72 h-72 object-contain" />
        </div>

        <h1 className="text-white text-3xl font-bold mb-3 leading-snug">
          Welcome to<br />Range Tracker&#8482;
        </h1>
        <p className="text-white/80 text-base mb-8 leading-relaxed">
          Click the button below<br />to create an account or log in
        </p>

        <a
          href="https://rtapp.supabase.angrycow.tech/storage/v1/object/public/range-photos/Range%20Tracker%20User%20Guide%20Mobile%20Edition%20Ver_00_02_35.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-12 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 mb-4 text-center"
          style={{ backgroundColor: 'white', color: '#153050', border: '2px solid white' }}
        >
          Get The Users Guide
        </a>
        <button
          type="button"
          onClick={handleGetStarted}
          className="px-12 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-white mb-8"
          style={{ backgroundColor: '#153050', border: '2px solid white' }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
