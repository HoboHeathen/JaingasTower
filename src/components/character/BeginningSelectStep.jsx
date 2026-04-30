import React from 'react';
import { cn } from '@/lib/utils';

export const BEGINNINGS = [
  { id: 'owl',    name: 'The Owl',    str: 8,  dex: 12, con: 10, int: 14, wis: 12, cha: 10 },
  { id: 'tiger',  name: 'The Tiger',  str: 10, dex: 14, con: 12, int: 8,  wis: 12, cha: 10 },
  { id: 'bear',   name: 'The Bear',   str: 14, dex: 10, con: 12, int: 8,  wis: 12, cha: 10 },
  { id: 'ox',     name: 'The Ox',     str: 12, dex: 10, con: 14, int: 8,  wis: 12, cha: 10 },
  { id: 'monkey', name: 'The Monkey', str: 12, dex: 14, con: 10, int: 8,  wis: 12, cha: 10 },
  { id: 'hare',   name: 'The Hare',   str: 8,  dex: 14, con: 10, int: 12, wis: 12, cha: 10 },
  { id: 'elk',    name: 'The Elk',    str: 14, dex: 12, con: 10, int: 8,  wis: 12, cha: 10 },
  { id: 'badger', name: 'The Badger', str: 14, dex: 10, con: 8,  int: 12, wis: 12, cha: 10 },
  { id: 'ferret', name: 'The Ferret', str: 10, dex: 10, con: 12, int: 8,  wis: 12, cha: 14 },
  { id: 'mole',   name: 'The Mole',   str: 8,  dex: 10, con: 12, int: 10, wis: 14, cha: 12 },
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