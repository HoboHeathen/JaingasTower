import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function parseAndRoll(fav) {
  if (fav.type === 'standard') {
    const rolls = Array.from({ length: fav.count }, () => rollDie(fav.die));
    const total = rolls.reduce((a, b) => a + b, 0) + (fav.modifier || 0);
    return { total, detail: `[${rolls.join(', ')}]${fav.modifier ? ` ${fav.modifier > 0 ? '+' : ''}${fav.modifier}` : ''} = ${total}` };
  }

  if (fav.type === 'formula') {
    const formula = fav.formula.trim().toLowerCase();

    const successMatch = formula.match(/^(\d+)d(\d+)\s*(>=|>)\s*(\d+)$/);
    if (successMatch) {
      const count = parseInt(successMatch[1]);
      const sides = parseInt(successMatch[2]);
      const op = successMatch[3];
      const threshold = parseInt(successMatch[4]);
      const rolls = Array.from({ length: count }, () => rollDie(sides));
      const successes = rolls.filter((r) => op === '>=' ? r >= threshold : r > threshold).length;
      return { total: successes, detail: `${successes} success${successes !== 1 ? 'es' : ''} (${rolls.join(', ')})` };
    }

    const keepMatch = formula.match(/^(\d+)d(\d+)k([hl])(\d+)$/);
    if (keepMatch) {
      const count = parseInt(keepMatch[1]);
      const sides = parseInt(keepMatch[2]);
      const mode = keepMatch[3];
      const keep = parseInt(keepMatch[4]);
      const rolls = Array.from({ length: count }, () => rollDie(sides));
      const sorted = [...rolls].sort((a, b) => mode === 'h' ? b - a : a - b);
      const kept = sorted.slice(0, keep);
      const total = kept.reduce((a, b) => a + b, 0);
      return { total, detail: `Kept: [${kept.join(', ')}] = ${total}` };
    }

    // Standard sum formula
    const parts = formula.split(/(?=[+-])/);
    let total = 0;
    const lines = [];
    for (let part of parts) {
      part = part.trim();
      const diceMatch = part.match(/^([+-]?\d*)d(\d+)$/);
      const numMatch = part.match(/^([+-]?\d+)$/);
      if (diceMatch) {
        const countStr = diceMatch[1].replace('+', '');
        const count = countStr === '' || countStr === '-' ? 1 : parseInt(countStr);
        const sides = parseInt(diceMatch[2]);
        const rolls = Array.from({ length: Math.abs(count) }, () => rollDie(sides));
        const sub = rolls.reduce((a, b) => a + b, 0);
        total += sub;
        lines.push(`${Math.abs(count)}d${sides}: [${rolls.join(', ')}]`);
      } else if (numMatch) {
        const n = parseInt(numMatch[1]);
        total += n;
        lines.push(`+${n}`);
      }
    }
    return { total, detail: lines.join(' ') + ` = ${total}` };
  }

  return { total: '?', detail: 'Unknown' };
}

export default function FavoritesRoller({ favorites, onRemove }) {
  const [results, setResults] = useState({});

  const handleRoll = (fav, idx) => {
    const r = parseAndRoll(fav);
    setResults((prev) => ({ ...prev, [idx]: r }));
  };

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-10">
        <Dices className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground">No favorites yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Save rolls from the Standard or Formula tabs using the ★ button.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {favorites.map((fav, idx) => (
        <div
          key={idx}
          className="bg-secondary/30 border border-border/40 rounded-xl p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono font-bold text-foreground">{fav.label}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{fav.type} roll</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" className="h-8 gap-1.5" onClick={() => handleRoll(fav, idx)}>
                <Dices className="w-3.5 h-3.5" />
                Roll
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {results[idx] && (
            <div className="bg-background/50 rounded-lg px-3 py-2">
              <p className="text-xl font-heading font-bold text-primary">{results[idx].total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{results[idx].detail}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}