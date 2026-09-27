import React from 'react';
import { Loader2 } from 'lucide-react';

export default function CloudLoader({ className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        minHeight: '200px',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <Loader2 
        className="animate-spin" 
        size={36} 
        color="var(--primary)" 
      />
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Loading data...
      </span>
    </div>
  );
}

export { CloudLoader };
