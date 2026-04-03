import React from 'react';

const ABILITIES = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

function fmtMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function AbilityScores({ character }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ABILITIES.map(({ key, label }) => {
        const score = character?.[key] ?? 8;
        const mod = getModifier(score);
        return (
          <div
            key={key}
            className="bg-secondary/50 border border-border/50 rounded-xl py-3 flex flex-col items-center gap-1"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
            <span className="text-xl font-heading font-bold text-foreground">{score}</span>
            <span className={`text-xs font-semibold ${mod >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {fmtMod(mod)}
            </span>
          </div>
        );
      })}
    </div>
  );
}