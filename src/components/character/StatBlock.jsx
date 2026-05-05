import React, { useState } from 'react';
import { Heart, Shield, Zap, Crosshair, Plus, Minus } from 'lucide-react';

const statConfig = [
  { key: 'health', label: 'Health', icon: Heart, color: 'text-red-400' },
  { key: 'armor', label: 'Armor', icon: Shield, color: 'text-blue-400' },
  { key: 'speed', label: 'Speed', icon: Zap, color: 'text-yellow-400' },
  { key: 'spell_range', label: 'Spell Range', icon: Crosshair, color: 'text-purple-400' },
];

function HpControls({ maxHp, currentHp, onUpdate }) {
  const [inputVal, setInputVal] = useState('');

  const applyDelta = (delta) => {
    const next = Math.min(maxHp, Math.max(0, (currentHp ?? maxHp) + delta));
    onUpdate({ current_hp: next });
  };

  const applyInput = () => {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num)) {
      const next = Math.min(maxHp, Math.max(0, num));
      onUpdate({ current_hp: next });
    }
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyInput();
  };

  return (
    <div className="w-full mt-1 flex flex-col items-center gap-1.5">
      {/* Current HP display */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-heading font-bold text-red-400">
          {currentHp ?? maxHp}
        </span>
        <span className="text-xs text-muted-foreground">/ {maxHp}</span>
      </div>

      {/* +/- buttons and text input */}
      <div className="flex items-center gap-1 w-full justify-center">
        <button
          onClick={() => applyDelta(-1)}
          className="w-6 h-6 rounded-md bg-destructive/20 hover:bg-destructive/40 text-destructive flex items-center justify-center transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={applyInput}
          onKeyDown={handleKeyDown}
          placeholder="HP"
          className="w-14 h-6 rounded-md bg-background/60 border border-border/60 text-center text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => applyDelta(1)}
          className="w-6 h-6 rounded-md bg-green-900/40 hover:bg-green-800/60 text-green-400 flex items-center justify-center transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function StatBlock({ character, skillBonuses, onUpdateCharacter }) {
  const stats = {
    health: (character?.base_health ?? 10) + (skillBonuses?.health || 0),
    armor: (character?.base_armor ?? 10) + (skillBonuses?.armor || 0),
    speed: (character?.base_speed ?? 30) + (skillBonuses?.speed || 0),
    spell_range: (character?.base_spell_range ?? 0) + (skillBonuses?.spell_range || 0),
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statConfig.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="bg-secondary/50 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2"
        >
          <Icon className={`w-5 h-5 ${color}`} />
          {key === 'health' && onUpdateCharacter ? (
            <HpControls
              maxHp={stats.health}
              currentHp={character?.current_hp}
              onUpdate={onUpdateCharacter}
            />
          ) : (
            <span className="text-2xl font-heading font-bold text-foreground">
              {stats[key]}
            </span>
          )}
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}