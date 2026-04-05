import React from 'react';

// Black background + orange minimalist line-art icons per race
const icons = {
  Human: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simple crown / human silhouette */}
      <circle cx="20" cy="13" r="5" stroke="#D97706" strokeWidth="1.5" />
      <path d="M10 34c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Orc: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tusks + heavy brow */}
      <circle cx="20" cy="14" r="6" stroke="#D97706" strokeWidth="1.5" />
      <path d="M15 20l-3 5M25 20l3 5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12h12" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 34c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Elf: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pointed ears */}
      <circle cx="20" cy="14" r="5" stroke="#D97706" strokeWidth="1.5" />
      <path d="M14 12l-4-3M26 12l4-3" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 34c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Leaf motif */}
      <path d="M20 3 C17 7 17 11 20 14 C23 11 23 7 20 3Z" stroke="#D97706" strokeWidth="1.2" />
    </svg>
  ),
  Dwarf: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Short stature + beard */}
      <circle cx="20" cy="12" r="5" stroke="#D97706" strokeWidth="1.5" />
      {/* Beard */}
      <path d="M15 17 Q20 26 25 17" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M12 34c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Axe */}
      <path d="M31 8l3 3-3 3" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 11h-6" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  Halfling: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Curly hair + small size */}
      <circle cx="20" cy="15" r="5" stroke="#D97706" strokeWidth="1.5" />
      <path d="M14 12 Q11 8 15 7 Q17 6 16 10" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M26 12 Q29 8 25 7 Q23 6 24 10" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Hairy feet hint */}
      <path d="M14 35 Q16 33 20 33 Q24 33 26 35" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 34c0-4.418 3.582-8 9-8s9 3.582 9 8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Gnome: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tall pointed hat */}
      <path d="M20 3 L14 18 L26 18 Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="20" cy="23" r="5" stroke="#D97706" strokeWidth="1.5" />
      <path d="M11 37c0-4.418 3.582-8 9-8s9 3.582 9 8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  'Bird Folk': (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Beak + feather crest */}
      <circle cx="20" cy="14" r="6" stroke="#D97706" strokeWidth="1.5" />
      {/* Beak */}
      <path d="M23 15 L27 17 L23 18" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Feather crest */}
      <path d="M17 8 L15 4M20 8 L20 3M23 8 L25 4" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
      {/* Wings */}
      <path d="M10 34 Q8 28 12 26 L20 24 L28 26 Q32 28 30 34" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Simian: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large round head + ears */}
      <circle cx="20" cy="15" r="7" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="11" cy="14" r="3" stroke="#D97706" strokeWidth="1.2" />
      <circle cx="29" cy="14" r="3" stroke="#D97706" strokeWidth="1.2" />
      {/* Muzzle */}
      <ellipse cx="20" cy="19" rx="4" ry="2.5" stroke="#D97706" strokeWidth="1.2" />
      {/* Body */}
      <path d="M12 36 Q10 29 14 26 L20 24 L26 26 Q30 29 28 36" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Lizardfolk: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Reptile head + scales */}
      <path d="M13 10 Q15 6 20 6 Q25 6 27 10 L29 18 Q25 22 20 22 Q15 22 11 18 Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Scales pattern */}
      <path d="M16 12 Q18 10 20 12 Q22 10 24 12" stroke="#D97706" strokeWidth="1" strokeLinecap="round" />
      <path d="M15 16 Q17 14 19 16 Q21 14 23 16 Q25 14 27 16" stroke="#D97706" strokeWidth="1" strokeLinecap="round" />
      {/* Tail hint */}
      <path d="M20 22 L18 30 L14 36" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 36 Q14 30 18 28 L20 24 L22 28 Q26 30 28 36" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  ),
};

const fallbackIcon = (name) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="13" r="5" stroke="#D97706" strokeWidth="1.5" />
    <path d="M10 34c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    <text x="20" y="37" textAnchor="middle" fontSize="6" fill="#D97706" fontFamily="serif">
      {name?.charAt(0)?.toUpperCase() || '?'}
    </text>
  </svg>
);

export default function RaceIcon({ raceName, size = 40 }) {
  const icon = icons[raceName] || fallbackIcon(raceName);
  return (
    <div
      className="rounded-lg bg-black flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <div style={{ width: size * 0.8, height: size * 0.8 }}>
        {icon}
      </div>
    </div>
  );
}