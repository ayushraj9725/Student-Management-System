import { apiRequest, setAuthToken, clearAuthToken, clearTenantContext, setActiveTenantId, setActiveTenantSlug } from './apiClient';
import {
  LoginRequest,
  AuthTokenResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  VerifyOtpRequest,
  OtpVerificationResponse,
  ResetPasswordRequest,
} from '../types/api';

const USER_STORAGE_KEY = 'auth_user';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const authService = {
  /**
   * Authenticate user with username or email and password.
   */
  async login(credentials: LoginRequest): Promise<AuthTokenResponse> {
    const response = await apiRequest<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response && response.accessToken) {
      setAuthToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response));
      }

      // If SuperAdmin, explicitly clear any school tenant context (zero tenant headers for superadmin)
      const isSuper = Boolean(
        response.isSuperAdmin ||
        response.role === 'PLATFORM_SUPER_ADMIN' ||
        response.username === 'superadmin'
      );
      if (isSuper) {
        clearTenantContext();
      } else if (response.organizationId && response.organizationSlug) {
        setActiveTenantId(response.organizationId);
        setActiveTenantSlug(response.organizationSlug);
      }
    }

    return response;
  },

  /**
   * Renew expired access token using the active refresh token.
   */
  async refreshToken(): Promise<AuthTokenResponse> {
    let token = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem(REFRESH_TOKEN_KEY) || '';
    }

    if (!token) {
      throw new Error('No refresh token available');
    }

    const payload: RefreshTokenRequest = { refreshToken: token };
    const response = await apiRequest<AuthTokenResponse>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response && response.accessToken) {
      setAuthToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response));
      }

      // If SuperAdmin, explicitly clear any school tenant context (zero tenant headers for superadmin)
      const isSuper = Boolean(
        response.isSuperAdmin ||
        response.role === 'PLATFORM_SUPER_ADMIN' ||
        response.username === 'superadmin'
      );
      if (isSuper) {
        clearTenantContext();
      } else if (response.organizationId && response.organizationSlug) {
        setActiveTenantId(response.organizationId);
        setActiveTenantSlug(response.organizationSlug);
      }
    }

    return response;
  },

  /**
   * Dispatch a 6-digit one-time password to the user's registered email address.
   */
  async forgotPassword(email: string, purpose: string = 'FORGOT_PASSWORD'): Promise<{ message?: string }> {
    const payload: ForgotPasswordRequest = { email: email.trim().toLowerCase(), purpose };
    return apiRequest<{ message?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Validate the submitted 6-digit OTP code and retrieve the password reset token.
   */
  async verifyOtp(email: string, otpCode: string, purpose: string = 'FORGOT_PASSWORD'): Promise<OtpVerificationResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.replace(/\s+/g, '').trim();
    const payload: VerifyOtpRequest = { email: cleanEmail, otpCode: cleanOtp, purpose };
    return apiRequest<OtpVerificationResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Complete password reset using verified reset token and new password.
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{ message?: string }> {
    return apiRequest<{ message?: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Terminate active session and invalidate refresh token.
   */
  async logout(): Promise<void> {
    let token = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem(REFRESH_TOKEN_KEY) || '';
    }

    try {
      if (token) {
        await apiRequest<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: token }),
        });
      }
    } catch (err) {
      // Suppress network errors during logout to guarantee clean local state
      console.warn('Backend logout notification skipped or failed', err);
    } finally {
      clearAuthToken();
      clearTenantContext();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  },

  /**
   * Retrieve active authenticated user metadata from local storage.
   */
  getCurrentUser(): AuthTokenResponse | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Check if a user session is active.
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },
};
