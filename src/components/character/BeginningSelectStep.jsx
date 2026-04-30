import React from 'react';
import { cn } from '@/lib/utils';


export const BEGINNINGS = [
    { id: 'owl', name: 'The Owl', str: -1, dex: +1, con: +0, int: +2, wis: +1, cha: +0 },
      { id: 'tiger', name: 'The Tiger', str: +0, dex: +2, con: +1, int: -1, wis: +1, cha: +0 },
        { id: 'bear', name: 'The Bear', str: +2, dex: +0, con: +1, int: -1, wis: +1, cha: +0 },
          { id: 'ox', name: 'The Ox', str: +1, dex: +0, con: +2, int: -1, wis: +1, cha: +0 },
            { id: 'monkey', name: 'The Monkey', str: +1, dex: +2, con: +0, int: -1, wis: +1, cha: +0 },
              { id: 'hare', name: 'The Hare', str: -1, dex: +2, con: +0, int: +1, wis: +1, cha: +0 },
                { id: 'elk', name: 'The Elk', str: +2, dex: +1, con: +0, int: -1, wis: +1, cha: +0 },
                  { id: 'badger', name: 'The Badger', str: +2, dex: +0, con: -1, int: +1, wis: +1, cha: +0 },
                    { id: 'ferret', name: 'The Ferret', str: +0, dex: +0, con: +1, int: -1, wis: +1, cha: +2 },
                      { id: 'mole', name: 'The Mole', str: -1, dex: +0, con: +1, int: +0, wis: +2, cha: +1 },
                      ];


const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export default function BeginningSelectStep({ selectedId, onSelect }) {
  return (
    <div className="pt-2">
      <p className="text-sm text-muted-foreground mb-3">Choose a beginning to set your base stat spread.</p>
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {BEGINNINGS.map((b) => {
          const isSelected = selectedId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={cn(
                'w-full text-left rounded-xl border px-4 py-3 transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40'
              )}
            >
              <p className={cn('font-heading font-semibold text-sm mb-2', isSelected ? 'text-primary' : 'text-foreground')}>
                {b.name}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {STATS.map((s) => (
                  <div key={s} className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">{STAT_LABELS[s]}</p>
                    <p className={cn('text-sm font-bold', b[s] >= 14 ? 'text-primary' : b[s] <= 8 ? 'text-muted-foreground' : 'text-foreground')}>
                      {b[s]}
                    </p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}