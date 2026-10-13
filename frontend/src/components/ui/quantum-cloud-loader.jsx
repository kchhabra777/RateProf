import React from 'react';

export default function CloudLoader({ className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        minHeight: '160px',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          height: '96px',
          width: '176px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* RED — Fast inner particle */}
        <div
          className="animate-quantum-red"
          style={{
            position: 'absolute',
            zIndex: 30,
            height: '16px',
            width: '16px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#f87171',
              boxShadow: '0 0 12px rgba(248,113,113,0.75), 0 0 24px rgba(248,113,113,0.3)',
            }}
          />
        </div>

        {/* BLUE — Large outer particle */}
        <div
          className="animate-quantum-blue"
          style={{
            position: 'absolute',
            zIndex: 10,
            height: '24px',
            width: '24px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#60a5fa',
              boxShadow: '0 0 16px rgba(96,165,250,0.7), 0 0 30px rgba(96,165,250,0.25)',
            }}
          />
        </div>

        {/* YELLOW — Center particle */}
        <div
          className="animate-quantum-yellow"
          style={{
            position: 'absolute',
            zIndex: 40,
            height: '20px',
            width: '20px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#facc15',
              boxShadow: '0 0 14px rgba(250,204,21,0.75), 0 0 26px rgba(250,204,21,0.3)',
            }}
          />
        </div>

        {/* GREEN — Slow orbital particle */}
        <div
          className="animate-quantum-green"
          style={{
            position: 'absolute',
            zIndex: 0,
            height: '14px',
            width: '14px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#4ade80',
              boxShadow: '0 0 12px rgba(74,222,128,0.75), 0 0 24px rgba(74,222,128,0.3)',
            }}
          />
        </div>
      </div>

      <style>{`
        /* --------------------------------
           RED — Fast horizontal orbit
        --------------------------------- */
        @keyframes quantum-red {
          0% {
            transform: translate3d(-46px, 7px, 0) scale(0.72);
            opacity: 0.45;
          }
          25% {
            transform: translate3d(-23px, -7px, 0) scale(0.95);
            opacity: 0.78;
          }
          50% {
            transform: translate3d(46px, 0, 0) scale(1.18);
            opacity: 1;
          }
          75% {
            transform: translate3d(23px, 7px, 0) scale(0.95);
            opacity: 0.78;
          }
          100% {
            transform: translate3d(-46px, 7px, 0) scale(0.72);
            opacity: 0.45;
          }
        }

        .animate-quantum-red {
          animation: quantum-red 3.8s cubic-bezier(0.37, 0, 0.63, 1) infinite;
          will-change: transform, opacity;
        }

        /* --------------------------------
           BLUE — Slow orbital movement
        --------------------------------- */
        @keyframes quantum-blue {
          0% {
            transform: translate3d(38px, -4px, 0) scale(1);
            opacity: 0.95;
          }
          25% {
            transform: translate3d(19px, 7px, 0) scale(0.88);
            opacity: 0.72;
          }
          50% {
            transform: translate3d(-38px, 3px, 0) scale(0.68);
            opacity: 0.42;
          }
          75% {
            transform: translate3d(-19px, -7px, 0) scale(0.88);
            opacity: 0.72;
          }
          100% {
            transform: translate3d(38px, -4px, 0) scale(1);
            opacity: 0.95;
          }
        }

        .animate-quantum-blue {
          animation: quantum-blue 5.6s cubic-bezier(0.37, 0, 0.63, 1) infinite;
          will-change: transform, opacity;
        }

        /* --------------------------------
           YELLOW — Central oscillator
        --------------------------------- */
        @keyframes quantum-yellow {
          0% {
            transform: translate3d(-27px, 2px, 0) scale(0.82);
            opacity: 0.65;
          }
          20% {
            transform: translate3d(-17px, -5px, 0) scale(0.94);
            opacity: 0.82;
          }
          50% {
            transform: translate3d(27px, 0, 0) scale(1.08);
            opacity: 1;
          }
          80% {
            transform: translate3d(17px, 5px, 0) scale(0.94);
            opacity: 0.82;
          }
          100% {
            transform: translate3d(-27px, 2px, 0) scale(0.82);
            opacity: 0.65;
          }
        }

        .animate-quantum-yellow {
          animation: quantum-yellow 3.1s cubic-bezier(0.37, 0, 0.63, 1) infinite;
          will-change: transform, opacity;
        }

        /* --------------------------------
           GREEN — Wide sweep
        --------------------------------- */
        @keyframes quantum-green {
          0% {
            transform: translate3d(64px, 6px, 0) scale(0.52);
            opacity: 0.25;
          }
          20% {
            transform: translate3d(43px, -5px, 0) scale(0.68);
            opacity: 0.45;
          }
          50% {
            transform: translate3d(0, 3px, 0) scale(1);
            opacity: 0.9;
          }
          80% {
            transform: translate3d(-43px, -5px, 0) scale(0.68);
            opacity: 0.45;
          }
          100% {
            transform: translate3d(-64px, 6px, 0) scale(0.52);
            opacity: 0.25;
          }
        }

        .animate-quantum-green {
          animation: quantum-green 6.4s cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-quantum-red,
          .animate-quantum-blue,
          .animate-quantum-yellow,
          .animate-quantum-green {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export { CloudLoader };
