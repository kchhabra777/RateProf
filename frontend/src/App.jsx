import CloudLoader from './components/ui/quantum-cloud-loader';
import { Marquee } from './components/ui/marquee';
import { TAG_THEMES } from './lib/tagTheme';
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { StudentOnboarding } from './pages/StudentOnboarding';
import { TeacherOnboarding } from './pages/TeacherOnboarding';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/Navbar';
import { Roadmap } from './pages/Roadmap';
import { PublicTeacherProfile } from './pages/PublicTeacherProfile';
import { AccountSuspended } from './components/AccountSuspended';

export function App() {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState('home');

  // Handle public teacher profiles (e.g. /teacher/123 or /teacher/dr-anjula-mehto)
  const teacherMatch = window.location.pathname.match(/^\/teacher\/([^/]+)/);
  if (teacherMatch) {
    const teacherIdentifier = decodeURIComponent(teacherMatch[1]);
    return (
      <PublicTeacherProfile
        teacherId={teacherIdentifier}
        onBack={() => window.location.href = '/'}
        onLoginClick={() => window.location.href = '/'}
      />
    );
  }

  if (window.location.pathname === '/roadmap') {
    return <Roadmap onBack={() => window.location.href = '/'} />;
  }

  if (window.location.pathname === '/marquee') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#fff', padding: '30px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Campus Community Tags Marquee</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>Infinite auto-scrolling with fade mask & pause on hover</p>
        
        <div style={{ width: '100%', maxWidth: '850px', padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Marquee pauseOnHover={true} duration={22}>
            {Object.values(TAG_THEMES).map(theme => (
              <span 
                key={theme.name}
                style={{ 
                  margin: '0 16px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: theme.color, 
                  padding: '6px 16px', 
                  borderRadius: '20px', 
                  background: theme.bg, 
                  border: `1px solid ${theme.borderSubtle}`
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.border }} />
                #{theme.name}
              </span>
            ))}
          </Marquee>
        </div>

        <a href="/" style={{ marginTop: '32px', fontSize: '14px', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#f8fafc' }}>
        <CloudLoader />
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.4px' }}>
          Loading Campus Feedback Portal...
        </p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Account suspended / banned by administration
  if (user.isBanned) {
    return <AccountSuspended user={user} onLogout={logout} />;
  }

  // Logged in but profile not complete
  if (!user.isProfileComplete) {
    if (user.role === 'STUDENT') {
      return <StudentOnboarding />;
    }
    if (user.role === 'TEACHER') {
      return <TeacherOnboarding />;
    }
  }

  // Logged in with complete profile
  return (
    <div className="app-container">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      {user.role === 'ADMIN' ? (
        <AdminDashboard />
      ) : user.role === 'STUDENT' ? (
        <StudentDashboard />
      ) : (
        <TeacherDashboard />
      )}
    </div>
  );
}

export default App;
