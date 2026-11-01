/**
 * Centralized API client configuring base URL, versioning prefix,
 * and tenant context headers across all frontend service requests.
 */

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8085/api/v1`)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1');

let activeTenantId: number | null = null;
let activeTenantSlug: string | null = null;

export function setActiveTenantId(tenantId: number | null): void {
  activeTenantId = tenantId;
  if (typeof window !== 'undefined') {
    if (tenantId !== null) {
      localStorage.setItem('active_tenant_id', String(tenantId));
    } else {
      localStorage.removeItem('active_tenant_id');
    }
  }
}

export function getActiveTenantId(): number | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('active_tenant_id');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }
  return activeTenantId;
}

export function setActiveTenantSlug(slug: string | null): void {
  activeTenantSlug = slug;
  if (typeof window !== 'undefined') {
    if (slug) {
      localStorage.setItem('active_tenant_slug', slug);
    } else {
      localStorage.removeItem('active_tenant_slug');
    }
  }
}

export function getActiveTenantSlug(): string | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('active_tenant_slug');
    if (saved) return saved;
    return null;
  }
  return activeTenantSlug;
}

export function clearTenantContext(): void {
  activeTenantId = null;
  activeTenantSlug = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('active_tenant_id');
    localStorage.removeItem('active_tenant_slug');
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('auth_token');
    if (saved) return saved;
  }
  return authToken;
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

let isRefreshing = false;
interface RefreshSubscriber {
  resolve: (newToken: string) => void;
  reject: (error: Error) => void;
}
let refreshSubscribers: RefreshSubscriber[] = [];

function onRefreshed(newToken: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed(error: Error) {
  refreshSubscribers.forEach((sub) => sub.reject(error));
  refreshSubscribers = [];
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (error: Error) => void) {
  refreshSubscribers.push({ resolve, reject });
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireTenantHeader: boolean = false
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tenant = getActiveTenantId();
  const slug = getActiveTenantSlug();
  if (tenant !== null) {
    headers['X-Tenant-ID'] = String(tenant);
  }
  if (slug) {
    headers['X-Tenant-Slug'] = slug;
  }
  if (tenant === null && !slug && requireTenantHeader) {
    throw new Error('Tenant context is required for this action. Please select an active school.');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized or 403 Forbidden with stale session by silently renewing token using Refresh Token
  if (
    (response.status === 401 || response.status === 403) &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh-token') &&
    typeof window !== 'undefined'
  ) {
    const existingRefreshToken = localStorage.getItem('refresh_token');

    if (existingRefreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: existingRefreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccessToken = refreshData.accessToken;
            const newRefreshToken = refreshData.refreshToken;

            setAuthToken(newAccessToken);
            localStorage.setItem('refresh_token', newRefreshToken);

            const userRaw = localStorage.getItem('auth_user');
            if (userRaw) {
              try {
                const userObj = JSON.parse(userRaw);
                userObj.accessToken = newAccessToken;
                userObj.refreshToken = newRefreshToken;
                localStorage.setItem('auth_user', JSON.stringify(userObj));
              } catch {
                // Ignore parse errors
              }
            }

            isRefreshing = false;
            onRefreshed(newAccessToken);

            // Retry original request with newly issued token
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            const retryRes = await fetch(url, { ...options, headers });
            if (retryRes.status === 204) return {} as T;
            const retryText = await retryRes.text();
            if (!retryText || retryText.trim() === '') return {} as T;
            return JSON.parse(retryText) as T;
          } else {
            // Refresh token has expired or was revoked
            isRefreshing = false;
            clearAuthToken();
            if (typeof window !== 'undefined') {
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('auth_user');
            }
            const sessionExpiryErr = new Error('Your session has expired. Please sign in again.');
            onRefreshFailed(sessionExpiryErr);
            throw sessionExpiryErr;
          }
        } catch (refreshErr) {
          isRefreshing = false;
          onRefreshFailed(refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr)));
          throw refreshErr;
        }
      } else {
        // Another request is already refreshing the token, wait for it
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber(
            (newToken: string) => {
              headers['Authorization'] = `Bearer ${newToken}`;
              fetch(url, { ...options, headers })
                .then(async (res) => {
                  if (res.status === 204) return {} as T;
                  const txt = await res.text();
                  if (!txt || txt.trim() === '') return {} as T;
                  return JSON.parse(txt) as T;
                })
                .then(resolve)
                .catch(reject);
            },
            (err: Error) => {
              reject(err);
            }
          );
        });
      }
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorText = await response.text();
      if (errorText && errorText.trim()) {
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText;
        }
      }
    } catch {
      // If reading fails, use default statusText
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as unknown as T;
  }
}
