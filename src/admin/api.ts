const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const ADMIN_BASE = `${SUPABASE_URL}/functions/v1/admin-api`;

function getAdminToken(): string {
  return localStorage.getItem('adminToken') || '';
}

export function setAdminToken(token: string): void {
  localStorage.setItem('adminToken', token);
}

export function clearAdminToken(): void {
  localStorage.removeItem('adminToken');
}

export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem('adminToken');
}

function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAdminToken()}`,
    'Apikey': SUPABASE_ANON_KEY,
  };
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${ADMIN_BASE}/${path}`, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.headers || {}),
    },
  });
}

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${ADMIN_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function fetchTenants() {
  const res = await adminFetch('tenants');
  return res.json();
}

export async function fetchRegistrations() {
  const res = await adminFetch('registrations');
  return res.json();
}

export async function approveTenant(id: string) {
  const res = await adminFetch(`tenants/${id}/approve`, { method: 'POST' });
  return res.json();
}

export async function rejectTenant(id: string) {
  const res = await adminFetch(`tenants/${id}/reject`, { method: 'POST' });
  return res.json();
}

export async function suspendTenant(id: string) {
  const res = await adminFetch(`tenants/${id}/suspend`, { method: 'POST' });
  return res.json();
}

export async function deleteTenant(id: string) {
  const res = await adminFetch(`tenants/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function resendApprovalEmail(id: string) {
  const res = await adminFetch(`tenants/${id}/resend-email`, { method: 'POST' });
  return res.json();
}

export async function fetchPlans() {
  const res = await adminFetch('plans');
  return res.json();
}

export async function setTenantPlan(id: string, planType: string) {
  const res = await adminFetch(`tenants/${id}/set-plan`, {
    method: 'POST',
    body: JSON.stringify({ plan_type: planType }),
  });
  return res.json();
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const res = await adminFetch('change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${ADMIN_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${ADMIN_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ token, newPassword }),
  });
  return res.json();
}
