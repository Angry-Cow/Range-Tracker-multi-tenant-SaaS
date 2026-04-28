import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './contexts/AppContext';
import App from './App.tsx';
import { AdminApp } from './admin/AdminApp.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { TenantLoginPage } from './pages/TenantLoginPage.tsx';
import { TenantResetPasswordPage } from './pages/TenantResetPasswordPage.tsx';
import { hasTenantCredentials } from './lib/apiClient.ts';
import './index.css';

const path = window.location.pathname;

function Root() {
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminApp />;
  }

  if (path === '/register' || path.startsWith('/register/')) {
    return <RegisterPage />;
  }

  if (path === '/reset-password' || path.startsWith('/reset-password/')) {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    return <TenantResetPasswordPage token={token} />;
  }

  if (!hasTenantCredentials()) {
    return <TenantLoginPage onSuccess={() => window.location.reload()} />;
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
