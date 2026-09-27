import React from 'react';
import { MessageSquare, ShieldCheck, BarChart3 } from 'lucide-react';

const BrandShowcase = () => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      maxHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
    }}>
      {/* Background Image — Real Thapar Campus Photo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage: 'url(/thapar-campus-real.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Dark Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.82) 50%, rgba(15, 23, 42, 0.92) 100%)',
        zIndex: 1,
      }} />

      {/* Warm Bottom Gradient */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
        background: 'linear-gradient(to top, rgba(185, 28, 28, 0.15) 0%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* Large TIET Watermark (very subtle) */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity: 0.04,
        pointerEvents: 'none',
      }}>
        <img
          src="/tiet-logo.svg"
          alt=""
          style={{
            width: '360px',
            height: 'auto',
            filter: 'brightness(0) invert(1)',
            opacity: 0.15,
          }}
        />
      </div>

      {/* Content Layer */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: 'clamp(18px, 2.8vh, 28px) clamp(22px, 3vw, 36px)',
        boxSizing: 'border-box',
        flex: 1,
      }}>
        {/* Top: Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/tiet-logo.svg"
            alt="TIET"
            style={{
              height: '34px',
              width: 'auto',
              filter: 'brightness(0) invert(1)',
            }}
          />
          <div style={{ borderLeft: '1.5px solid rgba(255,255,255,0.3)', paddingLeft: '12px' }}>
            <div style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.04em',
              lineHeight: 1.25,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              THAPAR INSTITUTE
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              OF ENGINEERING & TECHNOLOGY
            </div>
          </div>
        </div>

        {/* Middle: Hero Text */}
        <div style={{ marginTop: 'clamp(8px, 1.5vh, 16px)' }}>
          <div style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            RATEPROF • FACULTY FEEDBACK PLATFORM
          </div>

          <h1 style={{
            fontSize: 'clamp(26px, 3.2vw, 40px)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.12,
            margin: '0 0 clamp(8px, 1.2vh, 12px) 0',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}>
            Your Voice{' '}
            <br />
            Shapes a{' '}
            <span style={{ color: '#ef4444' }}>Better</span>
            <br />
            Campus
          </h1>

          <p style={{
            fontSize: '13.5px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.45,
            margin: 0,
            maxWidth: '380px',
            fontWeight: 400,
          }}>
            Share your feedback. Build a stronger learning experience at Thapar.
          </p>
        </div>

        {/* Features Card — Glassmorphism */}
        <div className="hide-on-mobile" style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: 'clamp(12px, 1.8vh, 16px) clamp(10px, 1.2vw, 14px)',
          marginTop: 'clamp(10px, 1.6vh, 16px)',
          display: 'flex',
          gap: '0',
        }}>
          {/* Anonymous & Honest */}
          <div style={{
            flex: 1,
            padding: '0 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageSquare size={17} color="#ef4444" />
            </div>
            <div style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.25,
            }}>
              Anonymous & Honest
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
            }}>
              Feedback is securely anonymous and cannot be traced to you.
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            background: 'rgba(255,255,255,0.1)',
            alignSelf: 'stretch',
          }} />

          {/* Secure & Verified */}
          <div style={{
            flex: 1,
            padding: '0 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={17} color="#22c55e" />
            </div>
            <div style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.25,
            }}>
              Secure & Verified
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
            }}>
              Authenticated through official university accounts and batch rosters.
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            background: 'rgba(255,255,255,0.1)',
            alignSelf: 'stretch',
          }} />

          {/* Drive Real Change */}
          <div style={{
            flex: 1,
            padding: '0 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BarChart3 size={17} color="#3b82f6" />
            </div>
            <div style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.25,
            }}>
              Drive Real Change
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
            }}>
              Data-driven insights help improve teaching and learning at Thapar.
            </div>
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="hide-on-mobile" style={{
          marginTop: 'clamp(10px, 1.6vh, 16px)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div style={{
            width: '3px',
            minHeight: '38px',
            background: '#ef4444',
            borderRadius: '2px',
            flexShrink: 0,
          }} />
          <div>
            <div style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#ffffff',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}>
              "A better tomorrow,
              <br />
              with your feedback today."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandShowcase;
