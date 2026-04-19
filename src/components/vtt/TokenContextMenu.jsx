import React, { useEffect, useRef } from 'react';
import { Trash2, Heart, Pencil, Target, Link, Eye, EyeOff } from 'lucide-react';

export default function TokenContextMenu({ token, x, y, isGM, onClose, onDelete, onEditHP, onRename, onPing, onLinkCharacter, onToggleVisibility }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const items = [
    { label: 'Ping Location', icon: Target, action: onPing, always: true },
    { label: 'Link Character', icon: Link, action: onLinkCharacter, always: true },
    { label: 'Edit HP', icon: Heart, action: onEditHP, always: false },
    { label: 'Rename', icon: Pencil, action: onRename, always: false },
    { label: token?.is_visible === false ? 'Show Token' : 'Hide Token', icon: token?.is_visible === false ? Eye : EyeOff, action: onToggleVisibility, always: false },
    { label: 'Remove Token', icon: Trash2, action: onDelete, always: false, danger: true },
  ];

  const visible = items.filter((i) => i.always || isGM);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-card border border-border/60 rounded-xl shadow-2xl py-1 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      {token && (
        <div className="px-3 py-1.5 border-b border-border/40 mb-1">
          <p className="text-xs font-semibold text-foreground truncate">{token.name}</p>
          {token.max_hp > 0 && (
            <p className="text-[10px] text-muted-foreground">{token.current_hp ?? token.max_hp} / {token.max_hp} HP</p>
          )}
        </div>
      )}
      {visible.map(({ label, icon: Icon, action, danger }) => (
        <button
          key={label}
          onClick={() => action?.()}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors ${danger ? 'text-destructive' : 'text-foreground'}`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}