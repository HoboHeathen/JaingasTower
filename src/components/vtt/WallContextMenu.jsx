import React, { useEffect, useRef, useState } from 'react';
import { Heart, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEFAULT_HP = { door: 25, window: 10 };

export default function WallContextMenu({ wall, x, y, onClose, onUpdateWall, containerWidth, containerHeight }) {
  const ref = useRef(null);
  const [editingHp, setEditingHp] = useState(false);
  const [hpInput, setHpInput] = useState('');
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    const maxX = (containerWidth || 800) - w - 4;
    const maxY = (containerHeight || 600) - h - 4;
    setAdjustedPos({ x: Math.max(4, Math.min(x, maxX)), y: Math.max(4, Math.min(y, maxY)) });
  }, [x, y, containerWidth, containerHeight, editingHp]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const hasHp = wall.max_hp > 0;
  const wallTypeName = wall.type === 'door' ? 'Door' : 'Window';
  const defaultHp = DEFAULT_HP[wall.type] || 10;

  const handleEnableHp = () => {
    onUpdateWall({ ...wall, max_hp: defaultHp, current_hp: defaultHp });
    onClose();
  };

  const handleRemoveHp = () => {
    onUpdateWall({ ...wall, max_hp: 0, current_hp: 0 });
    onClose();
  };

  const handleApplyHp = (delta) => {
    const current = wall.current_hp ?? wall.max_hp ?? 0;
    const newHp = Math.max(0, current + delta);
    onUpdateWall({ ...wall, current_hp: newHp });
    onClose();
  };

  const handleSetMaxHp = () => {
    const val = parseInt(hpInput);
    if (!isNaN(val) && val > 0) {
      onUpdateWall({ ...wall, max_hp: val, current_hp: val });
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute z-[9999] bg-card border border-border/60 rounded-xl shadow-2xl py-1 min-w-[190px]"
      style={{ top: adjustedPos.y, left: adjustedPos.x }}
    >
      <div className="px-3 py-1.5 border-b border-border/40 mb-1">
        <p className="text-xs font-semibold text-foreground">{wallTypeName}</p>
        {hasHp && (
          <p className="text-[10px] text-muted-foreground">{wall.current_hp ?? wall.max_hp} / {wall.max_hp} HP</p>
        )}
      </div>

      {!hasHp && (
        <button
          onClick={handleEnableHp}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground"
        >
          <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
          Enable HP Bar ({defaultHp} HP)
        </button>
      )}

      {hasHp && !editingHp && (
        <>
          <button
            onClick={() => { setHpInput(''); setEditingHp(true); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            Edit Max HP
          </button>
          <button
            onClick={handleRemoveHp}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Remove HP Bar
          </button>
        </>
      )}

      {hasHp && editingHp && (
        <div className="px-3 py-2 space-y-2">
          <Input
            type="number"
            className="h-7 text-xs"
            placeholder="New max HP..."
            value={hpInput}
            onChange={(e) => setHpInput(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSetMaxHp(); if (e.key === 'Escape') onClose(); }}
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px] flex-1" onClick={handleSetMaxHp}>Set</Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}