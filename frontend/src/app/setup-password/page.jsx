'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  KeyRound,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  X,
  Eye,
  EyeOff,
  Shield,
  Check,
  Sparkles,
} from 'lucide-react';
import { authService } from '../../services/authService';

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL parameters (Email is read, but OTP is STRICTLY NEVER PREFILLED)
  const initialEmail = searchParams.get('email') || '';
  const initialSlug = searchParams.get('slug') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState(''); // Strictly blank per enterprise security specification
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isActivated, setIsActivated] = useState(false);

  // Real-time Countdown Timer (15 minutes = 900s for institutional onboarding setup)
  const [timeLeft, setTimeLeft] = useState(900);

  // Resend / Expired Code Modal State
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  // Ticking countdown timer
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Password validation checks
  const isMinLength = newPassword.length >= 6;
  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Handle Requesting a Fresh OTP Code
  const handleRequestFreshOtp = async (e) => {
    if (e) e.preventDefault();
    if (resendCooldown > 0 || isResending) return;

    if (!email.trim()) {
      setErrorMessage('Please provide your registered school administrator email.');
      return;
    }

    setIsResending(true);
    setResendNotice('');
    try {
      await authService.forgotPassword(email.trim(), 'ONBOARDING_SETUP');
      setTimeLeft(900); // Reset timer to 15 mins
      setResendCooldown(60); // 60s cooldown
      setOtpCode(''); // Reset OTP input so user enters fresh code
      setResendNotice(`A fresh 6-digit verification code has been dispatched to ${email.trim()}.`);
      setErrorMessage('');
      setTimeout(() => {
        setIsResendModalOpen(false);
        setResendNotice('');
      }, 2000);
    } catch (err) {
      setResendNotice(err.message || 'Failed to dispatch new verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Handle Form Submission: Verify OTP & Set New Password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.replace(/\D/g, '').trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit security verification code from your email.');
      return;
    }

    if (timeLeft === 0) {
      setErrorMessage('Your verification code has expired. Please request a new code.');
      setIsResendModalOpen(true);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Verify OTP and receive reset token
      const verifyRes = await authService.verifyOtp(cleanEmail, cleanOtp, 'ONBOARDING_SETUP');
      if (!verifyRes.verified || !verifyRes.resetToken) {
        throw new Error(verifyRes.message || 'Invalid or expired verification code.');
      }

      // Step 2: Set New Password
      await authService.resetPassword({
        email: cleanEmail,
        resetToken: verifyRes.resetToken,
        newPassword: newPassword,
      });

      setIsActivated(true);
      setSuccessMessage('Password configured successfully! Your institutional account is active.');
    } catch (err) {
      setErrorMessage(err.message || 'Activation failed. Please verify your code and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // If activated, show completion success card
  if (isActivated) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '3rem 2.5rem',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(2, 132, 199, 0.06)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #0284c7 50%, #db2777 100%)',
          }}
        />

        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#16a34a',
            boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.25)',
          }}
        >
          <CheckCircle2 size={38} strokeWidth={2.4} />
        </div>

        <span
          style={{
            display: 'inline-block',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#15803d',
            backgroundColor: '#dcfce7',
            padding: '3px 12px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.75rem',
          }}
        >
          Workspace Ready
        </span>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>
          Account Activated Successfully!
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
          Your master administrator password has been securely registered. You are now authorized to manage institutional operations, staff rosters, and student records.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/"
            className="btn-executive-primary"
            style={{
              padding: '0.95rem 1.75rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.96rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            }}
          >
            <span>Proceed to Workspace Sign In</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '540px',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '2.5rem 2.25rem 2.25rem',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(2, 132, 199, 0.06)',
        border: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Signature Executive Top Gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 35%, #f472b6 65%, #db2777 100%)',
        }}
      />

      {/* Header Branding */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.65rem' }}>
          <img
            src="/logo.png"
            alt="My School Care Logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }
            }}
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div
            style={{
              display: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#e0f2fe',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
            }}
          >
            <Building2 size={22} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
            My School Care
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.65rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#0369a1',
              backgroundColor: '#e0f2fe',
              padding: '3px 12px',
              borderRadius: '12px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              border: '1px solid #bae6fd',
            }}
          >
            Institutional Account Setup
          </span>
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem', letterSpacing: '-0.3px' }}>
          Activate Administrator Account
        </h1>
        <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: 1.5, maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
          Enter the security verification code dispatched to your email and create your master password.
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.83rem',
            marginBottom: '1.25rem',
            lineHeight: 1.45,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.83rem',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* SECTION 1: IDENTITY & VERIFICATION CODE */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.15rem 1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Field 1: Administrator Email */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="setup-email"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}
              >
                Registered Administrator Email *
              </label>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                Institutional Identity
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0284c7' }}>
                <Mail size={16} />
              </div>
              <input
                id="setup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@school.edu"
                required
                style={{
                  width: '100%',
                  padding: '0.72rem 0.85rem 0.72rem 2.45rem',
                  borderRadius: '9px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 500,
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>
          </div>

          {/* Field 2: 6-Digit Verification Code */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="setup-otp"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}
              >
                6-Digit Security Verification Code *
              </label>

              {/* Countdown Timer Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: timeLeft === 0 ? '#fef2f2' : timeLeft <= 120 ? '#fff7ed' : '#e0f2fe',
                  color: timeLeft === 0 ? '#dc2626' : timeLeft <= 120 ? '#c2410c' : '#0369a1',
                  border: `1px solid ${timeLeft === 0 ? '#fecaca' : timeLeft <= 120 ? '#ffedd5' : '#bae6fd'}`,
                }}
              >
                <Clock size={12} strokeWidth={2.4} />
                <span>{timeLeft === 0 ? 'Code Expired' : `Valid for ${formatTime(timeLeft)}`}</span>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#0284c7' }}>
                <KeyRound size={17} />
              </div>
              <input
                id="setup-otp"
                type="text"
                maxLength={6}
                placeholder="Enter 6 digits"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                disabled={timeLeft === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                  borderRadius: '9px',
                  border: `1.5px solid ${timeLeft === 0 ? '#fca5a5' : '#cbd5e1'}`,
                  background: timeLeft === 0 ? '#fef2f2' : '#ffffff',
                  fontSize: otpCode ? '1.25rem' : '0.9rem',
                  letterSpacing: otpCode ? '0.38em' : 'normal',
                  textAlign: otpCode ? 'center' : 'left',
                  fontWeight: otpCode ? 800 : 400,
                  fontFamily: otpCode ? 'Consolas, Monaco, monospace' : 'inherit',
                  outline: 'none',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  if (timeLeft > 0) e.target.style.borderColor = '#0284c7';
                }}
                onBlur={(e) => {
                  if (timeLeft > 0) e.target.style.borderColor = '#cbd5e1';
                }}
              />
            </div>

            {/* Helper row with Resend Trigger */}
            <div
              style={{
                marginTop: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
              }}
            >
              <span style={{ color: timeLeft === 0 ? '#dc2626' : '#64748b' }}>
                {timeLeft === 0
                  ? 'Verification code has expired.'
                  : 'Check your Gmail inbox for the 6-digit code.'}
              </span>
              <button
                type="button"
                onClick={() => setIsResendModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 600,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'underline',
                }}
              >
                <RotateCw size={11} />
                <span>{timeLeft === 0 ? 'Request Fresh Code' : 'Resend Code'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: MASTER PASSWORD CREDENTIALS */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.15rem 1.15rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <ShieldCheck size={16} color="#0284c7" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
              Create Master Security Password
            </span>
          </div>

          {/* Field 3: New Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="setup-new-password"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}
              >
                New Password *
              </label>
              {newPassword.length > 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: isMinLength ? '#16a34a' : '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {isMinLength ? <Check size={12} strokeWidth={3} /> : null}
                  {isMinLength ? 'Length requirement met' : 'At least 6 characters required'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Lock size={16} />
              </div>
              <input
                id="setup-new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Choose strong master password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '0.72rem 2.6rem 0.72rem 2.45rem',
                  borderRadius: '9px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Field 4: Confirm Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="setup-confirm-password"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}
              >
                Confirm Password *
              </label>
              {confirmPassword.length > 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: isMatching ? '#16a34a' : '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {isMatching ? <Check size={12} strokeWidth={3} /> : null}
                  {isMatching ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <ShieldCheck size={16} />
              </div>
              <input
                id="setup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password to confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '0.72rem 2.6rem 0.72rem 2.45rem',
                  borderRadius: '9px',
                  border: `1.5px solid ${confirmPassword && !isMatching ? '#fca5a5' : '#cbd5e1'}`,
                  fontSize: '0.88rem',
                  outline: 'none',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || timeLeft === 0}
          className="btn-executive-primary"
          style={{
            width: '100%',
            padding: '0.9rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.94rem',
            fontWeight: 700,
            cursor: isLoading || timeLeft === 0 ? 'not-allowed' : 'pointer',
            opacity: isLoading || timeLeft === 0 ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            marginTop: '0.25rem',
          }}
        >
          {isLoading ? (
            <span>Activating Account...</span>
          ) : timeLeft === 0 ? (
            <span>Code Expired — Request Fresh Code</span>
          ) : (
            <>
              <span>Verify & Activate Workspace</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* Security Assurance & Navigation Links */}
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              color: '#64748b',
              marginBottom: '0.75rem',
            }}
          >
            <Shield size={13} color="#0284c7" />
            <span>Enterprise-Grade 256-bit TLS Handshake &bull; My School Care Security</span>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            <span>Already have active credentials?</span>{' '}
            <Link href="/" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
              Sign In here
            </Link>
          </div>
        </div>
      </form>

      {/* Resend / Fresh OTP Modal */}
      {isResendModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setIsResendModalOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                }}
              >
                <RotateCw size={16} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Request New Verification Code
              </h3>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
              If your code expired or was not delivered, confirm your administrator email below to dispatch a fresh 6-digit verification code.
            </p>

            {resendNotice && (
              <div
                style={{
                  fontSize: '0.8rem',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: resendNotice.includes('Failed') ? '#fef2f2' : '#f0fdf4',
                  color: resendNotice.includes('Failed') ? '#991b1b' : '#166534',
                  border: `1px solid ${resendNotice.includes('Failed') ? '#fecaca' : '#bbf7d0'}`,
                  marginBottom: '14px',
                  lineHeight: 1.4,
                }}
              >
                {resendNotice}
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Recipient Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@school.edu"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-executive-secondary"
                onClick={() => setIsResendModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: '8px', fontSize: '0.86rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-executive-primary"
                onClick={handleRequestFreshOtp}
                disabled={resendCooldown > 0 || isResending}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: resendCooldown > 0 || isResending ? 0.7 : 1,
                  cursor: resendCooldown > 0 || isResending ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCw size={13} className={isResending ? 'spin' : ''} />
                <span>{resendCooldown > 0 ? `Wait (${resendCooldown}s)` : 'Send Fresh Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #fce7f3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <Suspense
        fallback={
          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            Loading Account Activation Portal...
          </div>
        }
      >
        <SetupPasswordForm />
      </Suspense>
    </div>
  );
}

