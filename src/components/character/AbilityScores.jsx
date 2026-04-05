import React, { useState } from 'react';
import { Dices } from 'lucide-react';

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

function AbilityCard({ label, score }) {
  const mod = getModifier(score);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (rolling) return;
    if (result !== null) {
      setResult(null);
      return;
    }
    setRolling(true);
    setTimeout(() => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      setResult(d20 + mod);
      setRolling(false);
    }, 400);
  };

  return (
    <div
      className="bg-secondary/50 border border-border/50 rounded-xl py-3 flex flex-col items-center gap-1 cursor-pointer hover:border-primary/40 hover:bg-secondary/80 transition-all group relative"
      onClick={handleRoll}
      title={`Roll d20${fmtMod(mod)}`}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <span className="text-xl font-heading font-bold text-foreground">{score}</span>
      <span className={`text-xs font-semibold ${mod >= 0 ? 'text-primary' : 'text-destructive'}`}>
        {fmtMod(mod)}
      </span>
      <Dices className={`w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors ${rolling ? 'animate-spin' : ''}`} />
      {result !== null && !rolling && (
        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          {result}
        </span>
      )}
    </div>
  );
}

export default function AbilityScores({ character, skillBonuses = {} }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ABILITIES.map(({ key, label }) => {
        const score = (character?.[key] ?? 8) + (skillBonuses[key] || 0);
        return <AbilityCard key={key} label={label} score={score} />;
      })}
    </div>
  );
}