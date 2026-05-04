import React, { useEffect, useRef } from 'react';
import { Heart, HeartOff } from 'lucide-react';

export default function WallCellContextMenu({ cell, wall, x, y, onClose, onToggleHealth, onEditHealth }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const hasHealth = cell?.max_hp != null;

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-card border border-border/60 rounded-xl shadow-2xl py-1 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      <div className="px-3 py-1.5 border-b border-border/40 mb-1">
        <p className="text-xs font-semibold text-foreground capitalize">{wall?.type ?? 'Wall'} Cell</p>
        {hasHealth && (
          <p className="text-[10px] text-muted-foreground">{cell.current_hp ?? cell.max_hp} / {cell.max_hp} HP</p>
        )}
      </div>

      <button
        onClick={() => onToggleHealth?.()}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground"
      >
        {hasHealth ? <HeartOff className="w-3.5 h-3.5 shrink-0" /> : <Heart className="w-3.5 h-3.5 shrink-0" />}
        {hasHealth ? 'Remove Health Bar' : 'Add Health Bar'}
      </button>

      {hasHealth && (
        <button
          onClick={() => onEditHealth?.()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground"
        >
          <Heart className="w-3.5 h-3.5 shrink-0" />
          Edit Health
        </button>
      )}
    </div>
  );
}