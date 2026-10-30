import React from 'react';
import { Home, HeartHandshake, Award, User } from 'lucide-react';

export const MobileNav = ({ activeTab, setActiveTab }) => {
  return (
    <>
      {/* Spacer to prevent content from hiding behind the fixed bottom nav */}
      <div className="mobile-nav-spacer" style={{ height: '70px', display: 'none' }}></div>
      
      <div className="mobile-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-light)',
        display: 'none', // Hidden on desktop, overridden by CSS
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 0',
        zIndex: 100,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}>
        <NavButton 
          icon={<Home size={22} />} 
          label="Faculty" 
          isActive={activeTab === 'directory'} 
          onClick={() => setActiveTab('directory')} 
        />
        <NavButton 
          icon={<HeartHandshake size={22} />} 
          label="Ask & Discuss" 
          isActive={activeTab === 'feed'} 
          onClick={() => setActiveTab('feed')} 
        />
        <NavButton 
          icon={<Award size={22} />} 
          label="Top Helpers" 
          isActive={activeTab === 'leaderboard'} 
          onClick={() => setActiveTab('leaderboard')} 
        />
        <NavButton 
          icon={<User size={22} />} 
          label="Profile" 
          isActive={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
        />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .mobile-nav {
            display: flex !important;
          }
          .mobile-nav-spacer {
            display: block !important;
          }
        }
      `}} />
    </>
  );
};

const NavButton = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'color 0.2s ease',
        width: '60px'
      }}
    >
      <div style={{
        transition: 'transform 0.2s ease',
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
      }}>
        {icon}
      </div>
      <span style={{ 
        fontSize: '10px', 
        fontWeight: isActive ? 700 : 500 
      }}>
        {label}
      </span>
    </button>
  );
};
