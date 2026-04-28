import { useApp } from './contexts/AppContext';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NewShooterScreen } from './screens/NewShooterScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RangeRecordScreen } from './screens/RangeRecordScreen';
import { PreviousRecordsScreen } from './screens/PreviousRecordsScreen';
import { ViewRecordScreen } from './screens/ViewRecordScreen';
import { ShooterProfileScreen } from './screens/ShooterProfileScreen';
import { TenantLoginPage } from './pages/TenantLoginPage';
import { PaymentSuccessScreen } from './screens/PaymentSuccessScreen';
import { PaymentCancelledScreen } from './screens/PaymentCancelledScreen';
import { PaymentVerificationFailedScreen } from './screens/PaymentVerificationFailedScreen';
import { fetchPlanInfo } from './lib/apiClient';

function App() {
  const { currentScreen, setCurrentScreen, setPlanInfo } = useApp();

  async function handleLoginSuccess() {
    const info = await fetchPlanInfo();
    if (info) setPlanInfo(info);
    if (
      info &&
      info.pending_plan_type &&
      !info.stripe_subscription_id
    ) {
      setCurrentScreen('payment-verification-failed');
      return;
    }
    setCurrentScreen('home');
  }

  return (
    <>
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'login' && <TenantLoginPage onSuccess={handleLoginSuccess} />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'new-shooter' && <NewShooterScreen />}
      {currentScreen === 'settings' && <SettingsScreen />}
      {currentScreen === 'new-record' && <RangeRecordScreen />}
      {currentScreen === 'previous-records' && <PreviousRecordsScreen />}
      {currentScreen === 'view-record' && <ViewRecordScreen />}
      {currentScreen === 'shooter-profile' && <ShooterProfileScreen />}
      {currentScreen === 'payment-success' && <PaymentSuccessScreen />}
      {currentScreen === 'payment-cancelled' && <PaymentCancelledScreen />}
      {currentScreen === 'payment-verification-failed' && <PaymentVerificationFailedScreen />}
    </>
  );
}

export default App;
