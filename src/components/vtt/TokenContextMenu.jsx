import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Heart, Pencil, Target, Link, Eye, EyeOff, Scan, BookOpen, X, Shield, Dices } from 'lucide-react';
import { BESTIARY, getDamageDiceCount, getDieFaces, formatDamage } from '@/lib/bestiaryData';

function rollDice(count, faces) {
  let total = 0;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * faces) + 1;
  return total;
}

function MonsterStatBlock({ snapshot, onClose, isGM, activeEncounter }) {
  const [rollResult, setRollResult] = useState(null); // { actionName, hit, d20, damage }

  if (!snapshot) return null;
  const { name, defense, speed, attributes = [], actions = [], vulnerabilities = [], resistances = [], immunities = [] } = snapshot;

  const dieType = activeEncounter?.die_type || 'd6';
  const floorWave = activeEncounter?.wave_number || 1;

  const handleRollAttack = (action) => {
    const toHitMod = parseInt((action.to_hit || '+0').replace('+', '')) || 0;
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalHit = d20Roll + toHitMod;

    let totalDamage = null;
    if (action.damage_type) {
      const diceCount = getDamageDiceCount(action.damage_type, floorWave);
      const faces = getDieFaces(dieType);
      totalDamage = rollDice(diceCount, faces);
    }

    setRollResult({ actionName: action.name + (action.action_slot || ''), hit: totalHit, d20: d20Roll, damage: totalDamage });
  };

  return (
    <div className="mt-2 border-t border-border/40 pt-2 space-y-2 max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">{name || 'Monster'}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        {defense != null && <span className="flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />DEF {defense}</span>}
        {speed && <span>SPD {speed}</span>}
        <span className="ml-auto text-primary font-mono">{dieType} · W{floorWave}</span>
      </div>
      {vulnerabilities.length > 0 && (
        <div className="text-[10px]"><span className="text-red-400 font-semibold">Vuln: </span>{vulnerabilities.join(', ')}</div>
      )}
      {resistances.length > 0 && (
        <div className="text-[10px]"><span className="text-blue-400 font-semibold">Resist: </span>{resistances.join(', ')}</div>
      )}
      {immunities.length > 0 && (
        <div className="text-[10px]"><span className="text-green-400 font-semibold">Immune: </span>{immunities.join(', ')}</div>
      )}
      {attributes.length > 0 && (
        <div className="space-y-0.5">
          {attributes.map((a, i) => (
            <div key={i} className="text-[10px] text-foreground/80">
              <span className="font-semibold">{a.name}.</span> {a.description}
            </div>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</div>
          {actions.map((a, i) => {
            const key = a.name + (a.action_slot || '');
            const isRolled = rollResult?.actionName === key;
            return (
              <div key={i} className="bg-secondary/30 rounded px-1.5 py-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[10px] flex-1 min-w-0">
                    <span className="font-semibold text-foreground">{a.name}</span>
                    {a.to_hit && a.to_hit !== '—' && <span className="text-muted-foreground ml-1">{a.to_hit}</span>}
                    {a.damage_type && (
                      <span className="text-orange-400 ml-1">[{formatDamage(a.damage_type, floorWave, dieType)}]</span>
                    )}
                    {a.effect && <span className="text-muted-foreground ml-1">— {a.effect}</span>}
                  </div>
                  {isGM && (a.to_hit || a.damage_type) && (
                    <button
                      onClick={() => handleRollAttack(a)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/50 bg-secondary/50 hover:bg-primary/20 hover:border-primary/40 text-[10px] text-muted-foreground hover:text-primary transition-all shrink-0"
                    >
                      <Dices className="w-2.5 h-2.5" /> Roll
                    </button>
                  )}
                </div>
                {isRolled && (
                  <div className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                    Hit: {rollResult.hit} <span className="text-muted-foreground font-normal">(d20:{rollResult.d20})</span>
                    {rollResult.damage != null && <> · Dmg: <span className="text-orange-400">{rollResult.damage}</span></>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TokenContextMenu({ token, x, y, isGM, onClose, onDelete, onEditHP, onRename, onPing, onLinkCharacter, onToggleVisibility, losEnabled, onToggleLos, containerWidth, containerHeight, activeEncounter }) {
  const ref = useRef(null);
  const [showStats, setShowStats] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    const maxX = (containerWidth || 800) - w - 4;
    const maxY = (containerHeight || 600) - h - 4;
    setAdjustedPos({
      x: Math.max(4, Math.min(x, maxX)),
      y: Math.max(4, Math.min(y, maxY)),
    });
  }, [x, y, containerWidth, containerHeight, showStats]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const isMonster = token?.type === 'enemy' || token?.type === 'neutral' || token?.type === 'friendly';
  const resolvedSnapshot = token?.monster_snapshot || (token?.monster_id ? BESTIARY.find(m => m.id === token.monster_id) : null);
  const hasSnapshot = isMonster && resolvedSnapshot;

  const items = [
    { label: 'Ping Location', icon: Target, action: onPing, always: true },
    { label: 'Link Character', icon: Link, action: onLinkCharacter, always: true },
    { label: 'Edit HP', icon: Heart, action: onEditHP, always: false },
    { label: 'Rename', icon: Pencil, action: onRename, always: false },
    { label: token?.is_visible === false ? 'Show Token' : 'Hide Token', icon: token?.is_visible === false ? Eye : EyeOff, action: onToggleVisibility, always: false },
    { label: losEnabled ? 'Disable LOS' : 'Enable LOS', icon: Scan, action: onToggleLos, always: false },
    { label: 'Remove Token', icon: Trash2, action: onDelete, always: false, danger: true },
  ];

  const visible = items.filter((i) => i.always || isGM);

  return (
    <div
      ref={ref}
      className="absolute z-[9999] bg-card border border-border/60 rounded-xl shadow-2xl py-1 min-w-[180px] max-w-[260px]"
      style={{ top: adjustedPos.y, left: adjustedPos.x }}
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
      {hasSnapshot && (
        <button
          onClick={() => setShowStats((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-accent"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          {showStats ? 'Hide Stats' : 'View Stats'}
        </button>
      )}
      {showStats && (
        <div className="px-3 pb-2">
          <MonsterStatBlock
            snapshot={resolvedSnapshot}
            onClose={() => setShowStats(false)}
            isGM={isGM}
            activeEncounter={activeEncounter}
          />
        </div>
      )}
    </div>
  );
}