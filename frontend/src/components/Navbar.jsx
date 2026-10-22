import React from 'react';

export default function Navbar({ user, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        Student Management System
      </div>

      <div className="navbar-user">
        {user && (
          <>
            <span>
              Member: <strong>{user.fullName || user.username}</strong>
            </span>
            <button
              id="btn-logout"
              className="btn btn-outline btn-sm"
              onClick={onLogout}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
