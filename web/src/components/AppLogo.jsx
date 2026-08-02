import React from 'react';

export default function AppLogo({ size = 132, className = "" }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 132 132">
        <circle cx="66" cy="66" r="60" fill="#FFF7E6" />
        <path
          d="M34 41 L48 20 L58 49 Z"
          fill="#F28C28"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M98 41 L84 20 L74 49 Z"
          fill="#F28C28"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M30 54 C34 32 54 28 66 28 C78 28 98 32 102 54 C106 78 90 101 66 106 C42 101 26 78 30 54 Z"
          fill="#F28C28"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M40 63 C46 78 54 92 66 106 C78 92 86 78 92 63 C82 70 74 76 66 76 C58 76 50 70 40 63 Z"
          fill="#FFFFFF"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M58 72 C61 69 71 69 74 72 C72 78 60 78 58 72 Z"
          fill="#19386E"
          stroke="#19386E"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M54 82 C58 88 74 88 78 82"
          fill="none"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="51" cy="58" r="4" fill="#19386E" />
        <circle cx="81" cy="58" r="4" fill="#19386E" />
        <path
          d="M49 45 C54 42 58 43 61 47"
          fill="none"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M83 45 C78 42 74 43 71 47"
          fill="none"
          stroke="#19386E"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M46 24 L51 42"
          fill="none"
          stroke="#FFD166"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M86 24 L81 42"
          fill="none"
          stroke="#FFD166"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}