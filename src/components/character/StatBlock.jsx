import React from 'react';
import { Heart, Shield, Zap, Crosshair } from 'lucide-react';

const statConfig = [
  { key: 'health', label: 'Health', icon: Heart, color: 'text-red-400' },
  { key: 'armor', label: 'Armor', icon: Shield, color: 'text-blue-400' },
  { key: 'speed', label: 'Speed', icon: Zap, color: 'text-yellow-400' },
  { key: 'spell_range', label: 'Spell Range', icon: Crosshair, color: 'text-purple-400' },
];

export default function StatBlock({ character, skillBonuses }) {
  const stats = {
    health: (character?.base_health || 100) + (skillBonuses?.health || 0),
    armor: (character?.base_armor || 0) + (skillBonuses?.armor || 0),
    speed: (character?.base_speed || 30) + (skillBonuses?.speed || 0),
    spell_range: (character?.base_spell_range || 0) + (skillBonuses?.spell_range || 0),
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statConfig.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="bg-secondary/50 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2"
        >
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-2xl font-heading font-bold text-foreground">
            {stats[key]}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}