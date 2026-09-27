import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LogOut, User, Award, Sun, Moon } from 'lucide-react';

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar" style={{ transition: 'background-color 0.2s ease, border-color 0.2s ease' }}>
      <div className="navbar-inner">
        <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      <span className="hidden sm:inline"> ({user.studentProfile.branch})</span>
                    ) : ''}
                  </span>
                ) : (
                  <span className="badge badge-teacher">
                    <Award size={12} />
                    {user.teacherProfile?.fullName || 'Faculty'}
                  </span>
                )}
              </div>

              <button onClick={logout} className="btn btn-subtle btn-sm" title="Log out">
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
