import React, { useState } from 'react';

export default function AuthPage({ onLogin, onRegister, isLoading, authError }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both username and password.');
      return;
    }

    if (isRegisterMode) {
      if (!fullName.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      onRegister(username.trim(), password, fullName.trim());
    } else {
      onLogin(username.trim(), password);
    }
  };


  const errorMessage = localError || authError;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Student Management System</h2>
          <p>
            {isRegisterMode
              ? 'Management Member Registration'
              : 'Management Member Login'}
          </p>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(false);
              setLocalError('');
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(true);
              setLocalError('');
            }}
          >
            Register
          </button>
        </div>

        {errorMessage && (
          <div className="alert-box alert-error">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="form-group">
              <label className="form-label" htmlFor="reg-fullname">
                Full Name
              </label>
              <input
                id="reg-fullname"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
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
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>


          <button
            type="submit"
            id="btn-auth-submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
            disabled={isLoading}
          >
            {isLoading
              ? 'Please wait...'
              : isRegisterMode
              ? 'Register Account'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
