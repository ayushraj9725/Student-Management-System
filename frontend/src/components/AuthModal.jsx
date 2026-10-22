import React, { useState } from 'react';
import { X, Lock, User, UserPlus, LogIn, Key, Sparkles } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in both username and password.');
      return;
    }

    if (activeTab === 'register') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      onRegister(username.trim(), password, fullName.trim(), (err) => {
        if (err) setError(err.message || 'Registration failed.');
      });
    } else {
      onLogin(username.trim(), password, (err) => {
        if (err) setError(err.message || 'Invalid username or password.');
      });
    }
  };

  const handleFillDemoAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Lock size={22} color="var(--primary)" />
            <span>{activeTab === 'login' ? 'User Authentication' : 'Create New Account'}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '0.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              fontSize: '0.88rem',
              background: activeTab === 'login' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'login' ? '#ffffff' : 'var(--text-secondary)',
            }}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              fontSize: '0.88rem',
              background: activeTab === 'register' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : 'var(--text-secondary)',
            }}
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
          >
            <UserPlus size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {activeTab === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-fullname">
                Full Name
              </label>
              <input
                id="auth-fullname"
                type="text"
                className="form-control"
                placeholder="e.g. Administrator Ayush"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              className="form-control"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-control"
              placeholder="Enter password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {activeTab === 'login' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '-0.25rem',
                marginBottom: '1rem',
              }}
            >
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={13} />
                <span>Fill Default Credentials (admin / admin123)</span>
              </button>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-auth-submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? 'Processing...'
                : activeTab === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
