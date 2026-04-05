import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function statBonusEntries(race) {
  const fields = [
    { key: 'bonus_points', label: 'Skill Points' },
    { key: 'base_health_bonus', label: 'Health' },
    { key: 'base_armor_bonus', label: 'Armor' },
    { key: 'base_speed_bonus', label: 'Speed' },
    { key: 'base_spell_range_bonus', label: 'Spell Range' },
    { key: 'str_bonus', label: 'STR' },
    { key: 'dex_bonus', label: 'DEX' },
    { key: 'con_bonus', label: 'CON' },
    { key: 'int_bonus', label: 'INT' },
    { key: 'wis_bonus', label: 'WIS' },
    { key: 'cha_bonus', label: 'CHA' },
  ];
  return fields.filter((f) => race[f.key] && race[f.key] !== 0);
}

export default function RaceSelectStep({ races, selectedRaceId, onSelect }) {
  // Deduplicate by name, keeping the first occurrence
  const seen = new Set();
  const uniqueRaces = races.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });

  if (uniqueRaces.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No races have been created yet. Ask your game master to add races in the admin panel.
      </p>
    );
  }

  return (
    <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
      {uniqueRaces.map((race) => {
        const bonuses = statBonusEntries(race);
        const isSelected = selectedRaceId === race.id;
        return (
          <button
            key={race.id}
            type="button"
            onClick={() => onSelect(race.id)}
            className={cn(
              'text-left rounded-xl border p-4 transition-all',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border/50 bg-secondary/20 hover:bg-secondary/40'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-foreground">{race.name}</p>
                {race.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{race.description}</p>
                )}
                {bonuses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bonuses.map((b) => (
                      <Badge
                        key={b.key}
                        variant="outline"
                        className={cn(
                          'text-[10px] py-0',
                          race[b.key] > 0
                            ? 'text-green-400 border-green-400/40'
                            : 'text-red-400 border-red-400/40'
                        )}
                      >
                        {race[b.key] > 0 ? '+' : ''}{race[b.key]} {b.label}
                      </Badge>
                    ))}
                  </div>
                )}
                {race.special_traits && (
                  <p className="text-[11px] text-accent-foreground mt-2 leading-relaxed italic">
                    {race.special_traits}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}