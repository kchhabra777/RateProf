import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 260);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation for top arrow key & Home key
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in inputs or textareas
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      // If Command Menu or an active modal with its own scrolling is open, let it handle keys
      if (document.querySelector('[role="dialog"]') || document.querySelector('.command-menu-portal')) {
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Enhance keyboard Up Arrow scrolling when focus is on non-scrolling buttons/cards
        const target = e.target;
        const isTargetScrollable = target && target !== document.body && target.scrollHeight > target.clientHeight;
        if (!isTargetScrollable) {
          window.scrollBy({ top: -90, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        const isTargetScrollable = target && target !== document.body && target.scrollHeight > target.clientHeight;
        if (!isTargetScrollable) {
          window.scrollBy({ top: 90, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="scroll-to-top-button"
      title="Scroll to top (Up Arrow)"
      aria-label="Scroll to top"
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-card, #111827)',
        color: 'var(--text-primary, #f9fafb)',
        border: '1px solid var(--border-light, rgba(255, 255, 255, 0.16))',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 9999,
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.08)';
        e.currentTarget.style.borderColor = 'var(--primary, #ef4444)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.borderColor = 'var(--border-light, rgba(255, 255, 255, 0.16))';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
      }}
    >
      <ArrowUp size={20} strokeWidth={2.4} />
    </button>
  );
}
