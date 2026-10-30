import React, { useState } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { AlertCircle, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandShowcase from '../components/ui/auth/BrandShowcase';
import SignupForm from '../components/ui/auth/SignupForm';
import ForgotPasswordForm from '../components/ui/auth/ForgotPasswordForm';

export const AuthPage = () => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot-password'
  const { isSignedIn } = useUser();
  const { authError } = useAuth();

  return (
    <>
      {/* Responsive Styles */}
      <style>{`
        .auth-split-container {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          width: 100%;
          overflow: hidden;
        }
        .auth-left-panel {
          width: 50%;
          height: 100vh;
          max-height: 100vh;
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
        }
        .auth-right-panel {
          width: 50%;
          height: 100vh;
          max-height: 100vh;
          position: relative;
          flex-shrink: 0;
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .auth-right-panel::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        /* Login mode: center the Clerk widget nicely */
        .auth-login-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100vh;
          max-height: 100vh;
          padding: clamp(12px, 2vh, 20px) clamp(20px, 3.5vw, 40px);
          background: #ffffff;
          position: relative;
          box-sizing: border-box;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .auth-login-wrapper::-webkit-scrollbar {
          display: none;
        }
        .auth-login-wrapper::before {
          content: '';
          position: absolute;
          top: -60px;
          left: -40px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .auth-login-wrapper::after {
          content: '';
          position: absolute;
          bottom: -80px;
          right: -60px;
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        /* Mobile responsive */
        @media (max-width: 900px) {
          .auth-split-container {
            flex-direction: column;
            height: 100dvh;
            max-height: 100dvh;
            overflow: hidden;
            position: fixed;
            inset: 0;
          }
          .auth-left-panel {
            display: none; /* Completely hide on mobile */
          }
          .auth-right-panel {
            width: 100%;
            height: 100dvh;
            max-height: 100dvh;
          }
          .auth-login-wrapper {
            height: 100%;
            max-height: 100%;
            padding: 24px 16px;
            justify-content: flex-start;
          }
          .auth-center-content {
            margin: 24px auto 32px auto !important; /* Avoid vertical auto margin which causes top cutoff */
          }
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>

      <div className="auth-split-container">
        {/* ===== LEFT PANEL: Brand Showcase ===== */}
        <div className="auth-left-panel">
          <BrandShowcase />
        </div>

        {/* ===== RIGHT PANEL: Auth Form ===== */}
        <div className="auth-right-panel">
          {authMode === 'signup' ? (
            /* ----- SIGNUP MODE: Custom Form ----- */
            <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
          ) : authMode === 'forgot-password' ? (
            /* ----- FORGOT PASSWORD MODE: Custom Form ----- */
            <ForgotPasswordForm onSwitchToLogin={() => setAuthMode('login')} />
          ) : (
            /* ----- LOGIN MODE: Clerk SignIn Widget ----- */
            <div className="auth-login-wrapper">
              {/* Top Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#b91c1c',
                }}>
                  <GraduationCap size={13} />
                  Built by TIET students
                </div>
              </div>

              {/* Center Content */}
              <div className="auth-center-content" style={{
                width: '100%',
                maxWidth: '400px',
                margin: 'auto',
                position: 'relative',
                zIndex: 1,
                padding: '4px 0',
              }}>
                {/* Error Banner */}
                {authError && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{authError}</span>
                  </div>
                )}


                {/* Clerk SignIn Widget */}
                <SignIn
                  routing="hash"
                  signUpUrl="#/signup"
                  appearance={{
                    layout: {
                      logoImageUrl: '/rateprof-mark.svg',
                    },
                    variables: {
                      colorPrimary: '#b91c1c',
                      colorText: '#0f172a',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                    },
                    elements: {
                      card: {
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #f1f5f9',
                        borderRadius: '16px',
                        width: '100%',
                      },
                      rootBox: {
                        width: '100%',
                      },
                      footer: { display: 'none' },
                    },
                  }}
                />

                {/* Action Links: Forgot Password & Sign Up */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '14px',
                  padding: '0 2px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot-password')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b91c1c',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      padding: 0,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Forgot Password?
                  </button>

                  <div>
                    New to portal?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#b91c1c',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        padding: 0,
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {/* Security Note */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}>
                  <span>🔒</span>
                  <span>Only @thapar.edu accounts can join. Other students never see who wrote a review.</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                paddingTop: '8px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10.5px',
                color: '#9ca3af',
                position: 'relative',
                zIndex: 2,
                boxSizing: 'border-box',
              }}>
                <span>
                  RateProf is an independent student project for TIET, Patiala.
                  It is not an official university website.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
