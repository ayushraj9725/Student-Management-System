import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        padding: '0.9rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        background: isSuccess
          ? '#064e3b'
          : isError
          ? '#7f1d1d'
          : isWarning
          ? '#78350f'
          : '#1e293b',
        border: `1px solid ${
          isSuccess
            ? 'rgba(16, 185, 129, 0.4)'
            : isError
            ? 'rgba(239, 68, 68, 0.4)'
            : isWarning
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(255, 255, 255, 0.15)'
        }`,
        color: '#ffffff',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '420px',
        animation: 'modalSlideUp 200ms ease',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {isSuccess && <CheckCircle2 size={22} color="#34d399" />}
        {isError && <XCircle size={22} color="#f87171" />}
        {isWarning && <AlertTriangle size={22} color="#fbbf24" />}
        {!isSuccess && !isError && !isWarning && <Info size={22} color="#93c5fd" />}
      </div>
      <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.4' }}>
        {toast.message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
