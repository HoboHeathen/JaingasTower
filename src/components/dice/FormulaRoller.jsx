import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Parse and evaluate a formula like:
//   "2d6+3"          → standard roll
//   "4d20>12"        → count successes (rolls above threshold)
//   "4d20>=12"       → count successes (rolls at or above threshold)
//   "2d6+1d4+5"      → multi-dice sum
//   "3d6kh2"         → keep highest 2
//   "3d6kl2"         → keep lowest 2

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function parseAndRoll(formula) {
  formula = formula.trim().toLowerCase();

  // Success counting: e.g. 4d20>12 or 4d20>=12
  const successMatch = formula.match(/^(\d+)d(\d+)\s*(>=|>)\s*(\d+)$/);
  if (successMatch) {
    const count = parseInt(successMatch[1]);
    const sides = parseInt(successMatch[2]);
    const op = successMatch[3];
    const threshold = parseInt(successMatch[4]);
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const successes = rolls.filter((r) => op === '>=' ? r >= threshold : r > threshold).length;
    return {
      type: 'success',
      rolls,
      successes,
      threshold,
      op,
      label: `${count}d${sides}${op}${threshold}`,
      summary: `${successes} success${successes !== 1 ? 'es' : ''} out of ${count}`,
    };
  }

  // Keep highest/lowest: e.g. 3d6kh2 or 4d6kl1
  const keepMatch = formula.match(/^(\d+)d(\d+)k([hl])(\d+)$/);
  if (keepMatch) {
    const count = parseInt(keepMatch[1]);
    const sides = parseInt(keepMatch[2]);
    const mode = keepMatch[3]; // h or l
    const keep = parseInt(keepMatch[4]);
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const sorted = [...rolls].sort((a, b) => mode === 'h' ? b - a : a - b);
    const kept = sorted.slice(0, keep);
    const total = kept.reduce((a, b) => a + b, 0);
    return {
      type: 'keep',
      rolls,
      kept,
      total,
      label: `${count}d${sides}k${mode}${keep}`,
      summary: `Kept ${mode === 'h' ? 'highest' : 'lowest'} ${keep}: [${kept.join(', ')}] = ${total}`,
    };
  }

  // Standard formula: XdY+XdY+N e.g. "2d6+1d4+3"
  const parts = formula.split(/(?=[+-])/);
  let total = 0;
  const breakdown = [];
  let valid = true;

  for (let part of parts) {
    part = part.trim();
    const diceMatch = part.match(/^([+-]?\d*)d(\d+)$/);
    const numMatch = part.match(/^([+-]?\d+)$/);
    if (diceMatch) {
      const countStr = diceMatch[1].replace('+', '');
      const count = countStr === '' || countStr === '-' ? (countStr === '-' ? -1 : 1) : parseInt(countStr);
      const sides = parseInt(diceMatch[2]);
      const rolls = Array.from({ length: Math.abs(count) }, () => rollDie(sides));
      const sub = rolls.reduce((a, b) => a + b, 0) * (count < 0 ? -1 : 1);
      total += sub;
      breakdown.push({ type: 'dice', count, sides, rolls, sub });
    } else if (numMatch) {
      const n = parseInt(numMatch[1]);
      total += n;
      breakdown.push({ type: 'modifier', value: n });
    } else {
      valid = false;
      break;
    }
  }

  if (!valid) return { type: 'error', message: 'Invalid formula. Try: 2d6+3, 4d20>12, 3d6kh2' };

  return {
    type: 'standard',
    total,
    breakdown,
    label: formula,
    summary: `= ${total}`,
  };
}

const EXAMPLES = [
  { label: '4d20>12', desc: 'Count successes above 12' },
  { label: '2d6+1d4+3', desc: 'Multi-dice sum' },
  { label: '4d6kh3', desc: 'Keep highest 3 of 4d6' },
  { label: '5d12', desc: 'Big damage roll' },
];

export default function FormulaRoller({ onSaveFavorite }) {
  const [formula, setFormula] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRoll = () => {
    if (!formula.trim()) return;
    const r = parseAndRoll(formula);
    if (r.type === 'error') {
      setError(r.message);
      setResult(null);
    } else {
      setError('');
      setResult(r);
    }
  };

  const handleSave = () => {
    if (!formula.trim()) return;
    onSaveFavorite({ type: 'formula', label: formula.trim(), formula: formula.trim() });
  };

  return (
    <div className="space-y-5">
      {/* Input */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Dice formula</p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 4d20>12 or 2d6+3"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoll()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSave} title="Save to favorites">
            <Star className="w-4 h-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      {/* Examples */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Examples</p>
        <div className="grid grid-cols-2 gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setFormula(ex.label)}
              className="text-left rounded-lg border border-border/40 bg-secondary/30 hover:bg-secondary/60 px-3 py-2 transition-all"
            >
              <p className="text-xs font-mono font-bold text-primary">{ex.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{ex.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" disabled={!formula.trim()} onClick={handleRoll}>
        Roll Formula
      </Button>

      {/* Result */}
      {result && (
        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-2">
          {result.type === 'success' && (
            <>
              <p className="text-3xl font-heading font-bold text-primary text-center">{result.successes}</p>
              <p className="text-sm text-center text-foreground">{result.summary}</p>
              <p className="text-xs text-muted-foreground text-center">
                Rolls: [{result.rolls.map((r, i) => (
                  <span key={i} className={cn(
                    result.op === '>=' ? r >= result.threshold : r > result.threshold
                      ? 'text-primary font-bold' : 'text-muted-foreground'
                  )}>{r}{i < result.rolls.length - 1 ? ', ' : ''}</span>
                ))}]
              </p>
              <p className="text-[10px] text-muted-foreground text-center">
                (highlighted = success, threshold {result.op}{result.threshold})
              </p>
            </>
          )}
          {result.type === 'keep' && (
            <>
              <p className="text-3xl font-heading font-bold text-primary text-center">{result.total}</p>
              <p className="text-sm text-center text-muted-foreground">{result.summary}</p>
              <p className="text-xs text-muted-foreground text-center">All rolls: [{result.rolls.join(', ')}]</p>
            </>
          )}
          {result.type === 'standard' && (
            <>
              <p className="text-3xl font-heading font-bold text-primary text-center">{result.total}</p>
              <div className="text-xs text-muted-foreground text-center space-y-0.5">
                {result.breakdown.map((b, i) =>
                  b.type === 'dice' ? (
                    <p key={i}>{Math.abs(b.count)}d{b.sides}: [{b.rolls.join(', ')}] = {b.sub}</p>
                  ) : (
                    <p key={i}>Modifier: {b.value >= 0 ? '+' : ''}{b.value}</p>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}