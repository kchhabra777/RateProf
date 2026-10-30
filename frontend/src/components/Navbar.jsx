import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LogOut, User, Award, Sun, Moon, KeyRound } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

export const Navbar = ({ currentView, setCurrentView, onGoHome }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleBrandClick = (e) => {
    if (e) e.preventDefault();
    if (onGoHome) {
      onGoHome();
    } else {
      if (setCurrentView) setCurrentView('home');
      window.dispatchEvent(new CustomEvent('rateprof:navigate-home'));
      if (window.location.pathname !== '/') {
        window.history.pushState({ appNavigation: true, view: 'directory' }, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar" style={{ transition: 'background-color 0.2s ease, border-color 0.2s ease' }}>
      <div className="navbar-inner">
        <div
          className="brand-logo"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={handleBrandClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBrandClick(e);
            }
          }}
          title="Return to RateProf Homepage"
          aria-label="RateProf Homepage"
        >
          <img
            src="/tiet-navbar-logo.png"
            alt="Thapar Institute Logo"
            style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
          <div>
            <div className="brand-title">RateProf</div>
            <div className="brand-subtitle">Transparent &amp; Honest Campus Reviews</div>
          </div>
        </div>

        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dark Mode Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.role === 'ADMIN' ? (
                  <span className="badge" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', border: '1px solid #475569', fontWeight: 700 }}>
                    <User size={12} />
                    Administrator
                  </span>
                ) : user.role === 'STUDENT' ? (
                  <span className="badge badge-student">
                    <User size={12} />
                    {user.studentProfile?.rollNumber || user.detectedBatch || 'Student'}
                    {user.studentProfile?.branch ? (
                      <span className="nav-label"> ({user.studentProfile.branch})</span>
                    ) : ''}
                  </span>
                ) : (
                  <span className="badge badge-teacher">
                    <Award size={12} />
                    {user.teacherProfile?.fullName || 'Faculty'}
                  </span>
                )}
              </div>

              {/* Change Password Button */}
              <button
                onClick={() => setShowChangePassword(true)}
                className="btn btn-subtle btn-sm"
                title="Change Account Password"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <KeyRound size={14} />
                <span className="nav-label">Change Password</span>
              </button>

              <button onClick={logout} className="btn btn-subtle btn-sm" title="Log out" aria-label="Log out">
                <LogOut size={15} />
                <span className="nav-label">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
};
