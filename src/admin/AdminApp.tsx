import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { ResetPasswordPage } from './ResetPasswordPage';
import { isAdminLoggedIn } from './api';

function getResetToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token');
}

function clearResetToken() {
  const url = new URL(window.location.href);
  url.searchParams.delete('reset_token');
  window.history.replaceState({}, '', url.toString());
}

export function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());
  const [resetToken, setResetToken] = useState<string | null>(getResetToken);

  useEffect(() => {
    setLoggedIn(isAdminLoggedIn());
  }, []);

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onDone={() => { clearResetToken(); setResetToken(null); }}
      />
    );
  }

  if (!loggedIn) {
    return <AdminLogin onSuccess={() => setLoggedIn(true)} />;
  }

  return <AdminDashboard onLogout={() => setLoggedIn(false)} />;
}
