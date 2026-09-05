import React from 'react';

export function NeotLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="NEOT Portal Logo"
      className={className}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round">
        <path
          d="M11 16.8Q10 17.3 10 18t1 1.2l19.7 8.95q1.3.6 2.6 0L53 19.2q1-.5 1-1.2t-1-1.2L33.3 7.85q-1.3-.6-2.6 0L11 16.8Z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M18 50V27l28 23V27" strokeWidth="6" />
        <path d="M53 19V38.5" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="53" cy="41" r="2.4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
