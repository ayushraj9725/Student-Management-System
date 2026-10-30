import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable clean executive Modal dialog.
 * Features:
 * - Backdrop click to close, ESC key handling
 * - Clean white card with soft light blue border and signature gradient top line
 * - Natural spacing, polished typography, and smooth transitions
 * - Zero emojis, crisp Lucide icons
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        className={`modal-container ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.18s ease-out',
        }}
      >
        {/* 3px Signature Palette Accent Bar */}
        <div
          style={{
            height: '3px',
            width: '100%',
            background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 35%, #f472b6 65%, #db2777 100%)',
          }}
        />

        <div
          className="modal-header"
          style={{
            padding: '20px 24px 18px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(90deg, #f0f9ff 0%, #ffffff 40%, #fdf2f8 100%)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.45 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
            }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px', backgroundColor: '#ffffff', overflowY: 'auto' }}>
          {children}
        </div>

        {footer && (
          <div
            className="modal-footer"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
