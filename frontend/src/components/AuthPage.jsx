'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  School,
  Sliders,
  ChevronLeft,
  Clock,
  RotateCw
} from 'lucide-react';
import { authService } from '../services/authService';

export default function AuthPage({ onLoginSuccess, authError }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Password Recovery (Forgot Password & Onboarding Setup) Multi-Step State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Done
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // Real-time Countdown Timer (300s = 5 mins, 60s resend cooldown)
  const [otpTimeLeft, setOtpTimeLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);

  // Auto-fill from URL params (e.g. from Onboard School modal)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const setupEmail = params.get('setupEmail') || params.get('recoveryEmail');
      const initialOtp = params.get('otp');
      if (setupEmail) {
        setRecoveryEmail(setupEmail);
        setIsRecoveryMode(true);
        if (initialOtp && initialOtp.length === 6) {
          setOtpCode(initialOtp);
          setRecoveryStep(2);
          setOtpTimeLeft(900); // 15 mins for newly onboarded school head
          setResendCooldown(60);
        } else {
          setRecoveryStep(1);
        }
      }
    }
  }, []);

  // Ticking interval for countdown timer
  useEffect(() => {
    let interval = null;
    if (isRecoveryMode && recoveryStep === 2) {
      interval = setInterval(() => {
        setOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecoveryMode, recoveryStep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isRecoveryLoading) return;
    setRecoveryError('');
    setIsRecoveryLoading(true);
    try {
      await authService.forgotPassword(recoveryEmail.trim());
      setOtpTimeLeft(300);
      setResendCooldown(60);
      setSuccessNotice('New 6-digit security code sent to your email.');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      setRecoveryError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Handle standard Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!usernameOrEmail.trim() || !password.trim()) {
      setErrorMessage('Please enter both your identifier and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({
        usernameOrEmail: usernameOrEmail.trim(),
        password: password,
      });
      if (onLoginSuccess) {
        onLoginSuccess(response);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credential autofill helpers
  const handleFillDemoSchoolAdmin = () => {
    setUsernameOrEmail('admin');
    setPassword('admin123');
    setErrorMessage('');
  };

  const handleFillDemoPlatformAdmin = () => {
    setUsernameOrEmail('superadmin');
    setPassword('SuperAdmin@2026');
    setErrorMessage('');
  };

  // Recovery Step 1: Send OTP to Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setRecoveryError('');

    if (!recoveryEmail.trim()) {
      setRecoveryError('Please enter your registered email address.');
      return;
    }

    setIsRecoveryLoading(true);
    try {
      await authService.forgotPassword(recoveryEmail.trim());
      setOtpTimeLeft(300);
      setResendCooldown(60);
      setRecoveryStep(2);
    } catch (err) {
      setRecoveryError(err.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Recovery Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setRecoveryError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setRecoveryError('Please enter the 6-digit verification code.');
      return;
    }

    setIsRecoveryLoading(true);
    try {
      const res = await authService.verifyOtp(recoveryEmail.trim(), otpCode.trim(), 'FORGOT_PASSWORD');
      if (res.verified && res.resetToken) {
        setResetToken(res.resetToken);
        setRecoveryStep(3);
      } else {
        setRecoveryError(res.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setRecoveryError(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Recovery Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');

    if (newPassword.length < 6) {
      setRecoveryError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Password confirmation does not match.');
      return;
    }

    setIsRecoveryLoading(true);
    try {
      await authService.resetPassword({
        email: recoveryEmail.trim(),
        resetToken: resetToken,
        newPassword: newPassword,
      });
      setRecoveryStep(4);
    } catch (err) {
      setRecoveryError(err.message || 'Failed to update password. Reset token may have expired.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    setIsRecoveryMode(false);
    setRecoveryStep(1);
    setRecoveryEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setRecoveryError('');
    setSuccessNotice('Password reset completed successfully. Please sign in with your new password.');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #fce7f3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(224, 242, 254, 0.8)',
          boxShadow: '0 20px 40px -15px rgba(2, 132, 199, 0.12), 0 0 20px rgba(219, 39, 119, 0.05)',
          padding: '2.5rem 2rem',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.85rem',
            }}
          >
            <img
              src="/logo.png"
              alt="My School Care Logo"
              style={{ width: '48px', height: '48px', objectFit: 'contain' }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              margin: '0 0 0.35rem 0',
            }}
          >
            My School Care
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            {isRecoveryMode
              ? 'Password Recovery and Verification'
              : 'Institutional School Management Platform'}
          </p>
        </div>

        {/* Global Alert Messages */}
        {(errorMessage || authError) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage || authError}</span>
          </div>
        )}

        {successNotice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* --- VIEW 1: STANDARD LOGIN --- */}
        {!isRecoveryMode && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="login-identifier"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.4rem',
                }}
              >
                Username or Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                >
                  <User size={18} />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  placeholder="Enter username or email"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(true);
                    setRecoveryStep(1);
                    setRecoveryError('');
                    setErrorMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-sign-in"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'transform 0.1s ease',
              }}
            >
              {isLoading ? (
                <span>Authenticating credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Registration / Account Help Footer */}
            <div
              style={{
                marginTop: '1.5rem',
                textAlign: 'center',
                fontSize: '0.82rem',
                color: '#64748b',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1.25rem',
              }}
            >
              <span>Need institutional access or a new school onboarded?</span>{' '}
              <a
                href="mailto:support@myschoolcare.local"
                style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
              >
                Contact Support
              </a>
            </div>
          </form>
        )}

        {/* --- VIEW 2: MULTI-STEP OTP PASSWORD RECOVERY --- */}
        {isRecoveryMode && (
          <div>
            {/* Step Navigation Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (recoveryStep === 1) setIsRecoveryMode(false);
                  else setRecoveryStep((s) => s - 1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronLeft size={16} />
                <span>{recoveryStep === 1 ? 'Back to Sign In' : 'Previous Step'}</span>
              </button>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                Step {recoveryStep} of 3
              </span>
            </div>

            {recoveryError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{recoveryError}</span>
              </div>
            )}

            {/* Step 1: Input Email */}
            {recoveryStep === 1 && (
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="recovery-email"
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Registered Account Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    >
                      <Mail size={18} />
                    </div>
                    <input
                      id="recovery-email"
                      type="email"
                      placeholder="Enter registered email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.92rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                    A single-use 6-digit verification code will be dispatched to this address.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isRecoveryLoading}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: isRecoveryLoading ? 'not-allowed' : 'pointer',
                    opacity: isRecoveryLoading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isRecoveryLoading ? 'Dispatching code...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {/* Step 2: Input 6-Digit OTP */}
            {recoveryStep === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label
                      htmlFor="otp-code-input"
                      style={{
                        display: 'block',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      Enter 6-Digit Verification Code
                    </label>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: otpTimeLeft === 0 ? '#dc2626' : otpTimeLeft <= 60 ? '#ea580c' : '#0284c7',
                      }}
                    >
                      <Clock size={14} />
                      {otpTimeLeft === 0 ? 'Expired' : formatTime(otpTimeLeft)}
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    >
                      <KeyRound size={18} />
                    </div>
                    <input
                      id="otp-code-input"
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 453326"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={otpTimeLeft === 0}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                        borderRadius: '10px',
                        border: `1px solid ${otpTimeLeft === 0 ? '#fca5a5' : '#cbd5e1'}`,
                        background: otpTimeLeft === 0 ? '#fef2f2' : '#ffffff',
                        fontSize: '1.25rem',
                        letterSpacing: '0.35em',
                        textAlign: 'center',
                        fontWeight: 700,
                        outline: 'none',
                        color: '#0f172a',
                      }}
                    />
                  </div>

                  {/* Timer & Resend Status Box */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: otpTimeLeft === 0 ? '#fef2f2' : otpTimeLeft <= 60 ? '#fffbeb' : '#f0f9ff',
                      border: `1px solid ${otpTimeLeft === 0 ? '#fecaca' : otpTimeLeft <= 60 ? '#fde68a' : '#bae6fd'}`,
                      fontSize: '0.78rem',
                    }}
                  >
                    <span
                      style={{
                        color: otpTimeLeft === 0 ? '#991b1b' : otpTimeLeft <= 60 ? '#92400e' : '#0369a1',
                        fontWeight: 500,
                      }}
                    >
                      {otpTimeLeft === 0
                        ? 'Verification code has expired.'
                        : `Valid for: ${formatTime(otpTimeLeft)}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isRecoveryLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: resendCooldown > 0 ? '#94a3b8' : '#0284c7',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: 0,
                      }}
                    >
                      <RotateCw size={13} style={{ animation: isRecoveryLoading ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRecoveryLoading || otpTimeLeft === 0}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background:
                      otpTimeLeft === 0
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: isRecoveryLoading || otpTimeLeft === 0 ? 'not-allowed' : 'pointer',
                    opacity: isRecoveryLoading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isRecoveryLoading
                    ? 'Validating code...'
                    : otpTimeLeft === 0
                    ? 'Code Expired — Resend Above'
                    : 'Verify Code and Continue'}
                </button>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {recoveryStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor="reset-new-password"
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.4rem',
                    }}
                  >
                    New Account Password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="reset-confirm-password"
                    style={{
                      display: 'block',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRecoveryLoading}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: isRecoveryLoading ? 'not-allowed' : 'pointer',
                    opacity: isRecoveryLoading ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isRecoveryLoading ? 'Updating password...' : 'Save New Password'}
                </button>
              </form>
            )}

            {/* Step 4: Success confirmation */}
            {recoveryStep === 4 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    marginBottom: '1rem',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                  Password Reset Completed
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Your password has been securely updated. You can now sign in with your new credentials.
                </p>
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
