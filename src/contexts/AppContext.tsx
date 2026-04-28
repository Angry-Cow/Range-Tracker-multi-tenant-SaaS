import { createContext, useContext, useState, ReactNode } from 'react';
import type { Shooter, RangeRecord } from '../types';

type Screen =
  | 'splash'
  | 'login'
  | 'home'
  | 'new-shooter'
  | 'settings'
  | 'new-record'
  | 'previous-records'
  | 'view-record'
  | 'shooter-profile'
  | 'payment-success'
  | 'payment-cancelled'
  | 'payment-verification-failed';

function getInitialScreen(): Screen {
  const params = new URLSearchParams(window.location.search);
  const hasCredentials = !!(localStorage.getItem('tenantSlug') && localStorage.getItem('tenantToken'));
  if (params.get('payment_success') === '1' && hasCredentials) return 'payment-success';
  if (params.get('payment_cancelled') === '1' && hasCredentials) return 'payment-cancelled';
  return 'splash';
}

export interface PlanInfo {
  name: string;
  email: string;
  plan_type: string;
  unlimited: boolean;
  shooter_limit: number | null;
  records_limit: number | null;
  settings_limit: number | null;
  shooter_count: number;
  expires_at: string | null;
  downgrade_record_snapshot: Record<string, number> | null;
  pending_plan_type: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  payment_attempt_started_at: string | null;
  current_period_end: string | null;
}

export interface FilterLevel {
  type: string;
  value: string;
}

export interface RecordsCache {
  shooterId: string;
  records: RangeRecord[];
  filters: FilterLevel[];
  dateRange: { start: string; end: string };
}

interface AppContextType {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  selectedShooter: Shooter | null;
  setSelectedShooter: (shooter: Shooter | null) => void;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  planInfo: PlanInfo | null;
  setPlanInfo: (info: PlanInfo | null) => void;
  recordsCache: RecordsCache | null;
  setRecordsCache: (cache: RecordsCache | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen);
  const [selectedShooter, setSelectedShooter] = useState<Shooter | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [recordsCache, setRecordsCache] = useState<RecordsCache | null>(null);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        selectedShooter,
        setSelectedShooter,
        selectedRecordId,
        setSelectedRecordId,
        planInfo,
        setPlanInfo,
        recordsCache,
        setRecordsCache,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
