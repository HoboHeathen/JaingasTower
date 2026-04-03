import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function StandardRoller({ onSaveFavorite }) {
  const [counts, setCounts] = useState({ 4: 1, 6: 1, 8: 1, 10: 1, 12: 1, 20: 1, 100: 1 });
  const [modifier, setModifier] = useState(0);
  const [selectedDie, setSelectedDie] = useState(null);
  const [result, setResult] = useState(null);

  const handleRoll = () => {
    if (!selectedDie) return;
    const count = counts[selectedDie];
    const rolls = Array.from({ length: count }, () => rollDie(selectedDie));
    const total = rolls.reduce((a, b) => a + b, 0) + modifier;
    setResult({ rolls, total, die: selectedDie, count, modifier });
  };

  const handleSave = () => {
    if (!selectedDie) return;
    const label = `${counts[selectedDie]}d${selectedDie}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`;
    onSaveFavorite({ type: 'standard', label, die: selectedDie, count: counts[selectedDie], modifier });
  };

  return (
    <div className="space-y-5">
      {/* Dice grid */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Choose a die</p>
        <div className="grid grid-cols-4 gap-2">
          {DICE.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDie(d)}
              className={cn(
                'rounded-xl border py-3 text-center font-heading font-bold text-sm transition-all',
                selectedDie === d
                  ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/20'
                  : 'border-border/50 bg-secondary/30 text-foreground hover:bg-secondary/60'
              )}
            >
              d{d}
            </button>
          ))}
        </div>
      </div>

      {/* Count + modifier */}
      {selectedDie && (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Dice count</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setCounts((c) => ({ ...c, [selectedDie]: Math.max(1, c[selectedDie] - 1) }))}>−</Button>
              <span className="w-8 text-center font-bold text-foreground">{counts[selectedDie]}</span>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setCounts((c) => ({ ...c, [selectedDie]: c[selectedDie] + 1 }))}>+</Button>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Modifier</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setModifier((m) => m - 1)}>−</Button>
              <span className="w-8 text-center font-bold text-foreground">{modifier >= 0 ? `+${modifier}` : modifier}</span>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setModifier((m) => m + 1)}>+</Button>
            </div>
          </div>
        </div>
      )}

      {/* Roll button */}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={!selectedDie} onClick={handleRoll}>
          Roll {selectedDie ? `${counts[selectedDie]}d${selectedDie}` : ''}
        </Button>
        <Button variant="outline" size="icon" disabled={!selectedDie} onClick={handleSave} title="Save to favorites">
          <Star className="w-4 h-4" />
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 text-center space-y-1">
          <p className="text-3xl font-heading font-bold text-primary">{result.total}</p>
          <p className="text-xs text-muted-foreground">
            [{result.rolls.join(', ')}]{result.modifier !== 0 ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}