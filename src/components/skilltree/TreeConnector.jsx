import React from 'react';

export default function TreeConnector({ isActive }) {
  return (
    <div className="flex items-center justify-center h-6">
      <div
        className={`w-0.5 h-full transition-colors ${
          isActive ? 'bg-primary/60' : 'bg-border/40'
        }`}
      />
    </div>
  );
}