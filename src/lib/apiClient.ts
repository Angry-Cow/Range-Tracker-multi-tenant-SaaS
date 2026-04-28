import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_BASE = `${SUPABASE_URL}/functions/v1/tenant-api`;

const supabaseStorageClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getTenantToken(): string {
  return localStorage.getItem('tenantToken') || '';
}

function getTenantSlug(): string {
  return localStorage.getItem('tenantSlug') || '';
}

function edgeHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getTenantToken()}`,
    'Apikey': SUPABASE_ANON_KEY,
  };
}

type QueryResult<T> = { data: T | null; error: { message: string } | null };

class QueryBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
  private _body: Record<string, unknown> | null = null;
  private _filters: Array<[string, string, unknown]> = [];
  private _orderField: string | null = null;
  private _orderAsc = true;
  private _singleRow = false;

  constructor(table: string) {
    this._table = table;
  }

  select(_cols?: string) { return this; }

  eq(field: string, value: unknown): this {
    this._filters.push([field, 'eq', value]);
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this._orderField = field;
    this._orderAsc = opts?.ascending !== false;
    return this;
  }

  insert(rows: Record<string, unknown>[]): this {
    this._method = 'POST';
    this._body = rows[0];
    return this;
  }

  update(data: Record<string, unknown>): this {
    this._method = 'PUT';
    this._body = data;
    return this;
  }

  delete(): this {
    this._method = 'DELETE';
    return this;
  }

  single(): this {
    this._singleRow = true;
    return this;
  }

  async execute(): Promise<QueryResult<T>> {
    const slug = getTenantSlug();
    if (!slug) return { data: null, error: { message: 'No tenant selected' } };

    let idFromFilter: string | null = null;
    const queryParams: string[] = [];

    for (const [field, _op, value] of this._filters) {
      if (field === 'id') {
        idFromFilter = String(value);
      } else {
        queryParams.push(`${field}=${encodeURIComponent(String(value))}`);
      }
    }

    const qs = queryParams.length ? `?${queryParams.join('&')}` : '';

    if (this._method === 'GET') {
      const url = idFromFilter
        ? `${EDGE_BASE}/${this._table}/${idFromFilter}${qs}`
        : `${EDGE_BASE}/${this._table}${qs}`;
      const res = await fetch(url, { headers: edgeHeaders() });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || 'Request failed' } };

      let result = data.data;
      if (Array.isArray(result)) {
        if (this._orderField) {
          const field = this._orderField;
          const asc = this._orderAsc;
          result = [...result].sort((a, b) => {
            const av = a[field] ?? 0;
            const bv = b[field] ?? 0;
            const numA = Number(av);
            const numB = Number(bv);
            if (!isNaN(numA) && !isNaN(numB)) {
              return asc ? numA - numB : numB - numA;
            }
            return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
          });
        }
        if (this._singleRow) result = result[0] ?? null;
      }
      return { data: result as T, error: null };
    }

    if (this._method === 'POST') {
      const res = await fetch(`${EDGE_BASE}/${this._table}`, {
        method: 'POST',
        headers: edgeHeaders(),
        body: JSON.stringify(this._body),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || 'Request failed' } };
      return { data: data.data as T, error: null };
    }

    if (this._method === 'PUT') {
      if (!idFromFilter) return { data: null, error: { message: 'Missing id for update' } };
      const res = await fetch(`${EDGE_BASE}/${this._table}/${idFromFilter}`, {
        method: 'PUT',
        headers: edgeHeaders(),
        body: JSON.stringify(this._body),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || 'Request failed' } };
      return { data: data.data as T, error: null };
    }

    if (this._method === 'DELETE') {
      if (!idFromFilter) return { data: null, error: { message: 'Missing id for delete' } };
      const res = await fetch(`${EDGE_BASE}/${this._table}/${idFromFilter}`, {
        method: 'DELETE',
        headers: edgeHeaders(),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || 'Request failed' } };
      return { data: null, error: null };
    }

    return { data: null, error: { message: 'Unknown operation' } };
  }

  then<TResult1 = QueryResult<T>>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null
  ): Promise<TResult1> {
    return this.execute().then(onfulfilled ?? ((v) => v as unknown as TResult1));
  }
}

class StorageClient {
  private _bucket: string;

  constructor(bucket: string) {
    this._bucket = bucket;
  }

  async upload(fileName: string, file: File, _opts?: object): Promise<{ data: { path: string } | null; error: { message: string } | null }> {
    const { data, error } = await supabaseStorageClient.storage
      .from(this._bucket)
      .upload(fileName, file, { upsert: true });

    if (error) return { data: null, error: { message: error.message } };
    return { data: { path: data.path }, error: null };
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    const { data } = supabaseStorageClient.storage.from(this._bucket).getPublicUrl(path);
    return { data: { publicUrl: data.publicUrl } };
  }
}

class StorageManager {
  from(bucket: string): StorageClient {
    return new StorageClient(bucket);
  }
}

function from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
  return new QueryBuilder<T>(table);
}

export const apiClient = {
  from,
  storage: new StorageManager(),
};

export function setTenantCredentials(slug: string, token: string): void {
  localStorage.setItem('tenantSlug', slug);
  localStorage.setItem('tenantToken', token);
}

export function clearTenantCredentials(): void {
  localStorage.removeItem('tenantSlug');
  localStorage.removeItem('tenantToken');
}

export function hasTenantCredentials(): boolean {
  return !!(localStorage.getItem('tenantSlug') && localStorage.getItem('tenantToken'));
}

export function getTenantInfo(): { slug: string; token: string } | null {
  const slug = localStorage.getItem('tenantSlug');
  const token = localStorage.getItem('tenantToken');
  if (!slug || !token) return null;
  return { slug, token };
}

export function getPhotoPublicUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const { data } = supabaseStorageClient.storage.from('range-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function verifyTenantPassword(password: string): Promise<{ verified: boolean; error: string | null }> {
  const slug = getTenantSlug();
  if (!slug) return { verified: false, error: 'No tenant session' };
  try {
    const res = await fetch(`${EDGE_BASE}/verify-password`, {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({ password }),
    });
    const body = await res.json();
    if (!res.ok || body.error) return { verified: false, error: body.error || 'Verification failed' };
    return { verified: true, error: null };
  } catch {
    return { verified: false, error: 'Network error' };
  }
}

export async function changePlan(new_plan_type: string): Promise<{ error: string | null }> {
  const slug = getTenantSlug();
  if (!slug) return { error: 'No tenant session' };
  try {
    const res = await fetch(`${EDGE_BASE}/change-plan`, {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({ new_plan_type }),
    });
    const body = await res.json();
    if (!res.ok || body.error) return { error: body.error || 'Plan change failed' };
    return { error: null };
  } catch {
    return { error: 'Network error' };
  }
}

export async function createCheckoutSession(plan_type: string): Promise<{ url: string | null; error: string | null }> {
  const slug = getTenantSlug();
  if (!slug) return { url: null, error: 'No tenant session' };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({ plan_type }),
    });
    const body = await res.json();
    if (!res.ok || body.error) return { url: null, error: body.error || 'Failed to create checkout session' };
    return { url: body.data.url, error: null };
  } catch {
    return { url: null, error: 'Network error' };
  }
}

export async function createPortalSession(): Promise<{ url: string | null; error: string | null }> {
  const slug = getTenantSlug();
  if (!slug) return { url: null, error: 'No tenant session' };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: edgeHeaders(),
    });
    const body = await res.json();
    if (!res.ok || body.error) return { url: null, error: body.error || 'Failed to create portal session' };
    return { url: body.data.url, error: null };
  } catch {
    return { url: null, error: 'Network error' };
  }
}

export async function patchSettingOrders(updates: { id: string; sort_order: number }[]): Promise<{ error: string | null }> {
  const slug = getTenantSlug();
  if (!slug) return { error: 'No tenant session' };
  try {
    const res = await fetch(`${EDGE_BASE}/setting_values`, {
      method: 'PATCH',
      headers: edgeHeaders(),
      body: JSON.stringify(updates),
    });
    const body = await res.json();
    if (!res.ok || body.error) return { error: body.error || 'Reorder failed' };
    return { error: null };
  } catch {
    return { error: 'Network error' };
  }
}

export async function fetchRangeRecords(
  shooterId: string,
  page: number,
  pageSize: number
): Promise<{ data: import('../types').RangeRecord[]; total: number; page: number; page_size: number } | null> {
  const slug = getTenantSlug();
  if (!slug) return null;
  try {
    const qs = `?shooter_id=${encodeURIComponent(shooterId)}&page=${page}&page_size=${pageSize}`;
    const res = await fetch(`${EDGE_BASE}/range_records${qs}`, { headers: edgeHeaders() });
    const body = await res.json();
    if (!res.ok || body.error) return null;
    return { data: body.data ?? [], total: body.total ?? 0, page: body.page ?? page, page_size: body.page_size ?? pageSize };
  } catch {
    return null;
  }
}

export async function fetchPlanInfo(): Promise<{ name: string; email: string; plan_type: string; unlimited: boolean; shooter_limit: number | null; records_limit: number | null; settings_limit: number | null; shooter_count: number; expires_at: string | null; downgrade_record_snapshot: Record<string, number> | null; pending_plan_type: string | null; stripe_subscription_id: string | null; stripe_subscription_status: string | null; payment_attempt_started_at: string | null } | null> {
  const slug = getTenantSlug();
  if (!slug) return null;
  try {
    const res = await fetch(`${EDGE_BASE}/plan-info`, { headers: edgeHeaders() });
    const body = await res.json();
    if (!res.ok || body.error) return null;
    return body.data;
  } catch {
    return null;
  }
}
