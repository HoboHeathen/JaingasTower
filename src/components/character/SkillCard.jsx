import React, { useState } from 'react';
import { ChevronDown, Dice6, Sword } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEAPON_DICE = {
  dagger: 'd4',
  sword: 'd6',
  shortbow: 'd6',
  light_crossbow: 'd8',
  polearm: 'd8',
  longbow: 'd10',
  axe: 'd10',
  heavy_crossbow: 'd12',
  hammer: 'd12',
};

const DICE_SIDES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12 };

const attackBadge = {
  light: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  medium: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  heavy: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function SkillCard({ skill, category, isUsed, onMarkUsed }) {
  const [expanded, setExpanded] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  const weapon = skill.weapon_required;
  const attackSub = skill.attack_sub_category;

  // Determine dice: skill override > weapon default
  let diceName = null;
  if (skill.damage_dice && skill.damage_dice !== 'custom') {
    diceName = skill.damage_dice;
  } else if (skill.damage_dice === 'custom' && attackSub) {
    const overrides = {
      light: skill.damage_override_light,
      medium: skill.damage_override_medium,
      heavy: skill.damage_override_heavy,
    };
    diceName = overrides[attackSub] || null;
  } else if (weapon && weapon !== 'any') {
    diceName = WEAPON_DICE[weapon] || null;
  }

  const diceSides = diceName ? DICE_SIDES[diceName] : null;
  const canRoll = !!diceSides;

  const handleRoll = (e) => {
    e.stopPropagation();
    if (!canRoll || isUsed) return;
    const result = rollDie(diceSides);
    setRollResult(result);
    if (skill.is_single_use) {
      onMarkUsed(skill.id);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isUsed
          ? 'border-border/30 bg-muted/20 opacity-50'
          : 'border-border/50 bg-background/50'
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isUsed ? 'text-muted-foreground line-through' : 'text-foreground')}>
            {skill.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{skill.treeName}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {attackSub && (
            <Badge variant="outline" className={`text-[10px] px-1.5 ${attackBadge[attackSub]}`}>
              {attackSub}
            </Badge>
          )}
          {weapon && weapon !== 'any' && (
            <Sword className="w-3 h-3 text-muted-foreground" />
          )}
          {skill.is_single_use && (
            <Badge variant="outline" className="text-[10px] px-1.5 border-muted-foreground/30 text-muted-foreground">
              1×
            </Badge>
          )}
          {canRoll && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleRoll}
              disabled={isUsed}
              title={`Roll ${diceName}`}
            >
              <Dice6 className="w-3.5 h-3.5" />
            </Button>
          )}
          <ChevronDown
            className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </div>

      {/* Roll result */}
      {rollResult !== null && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md px-2 py-1">
            <Dice6 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">
              Rolled {diceName}: <span className="text-lg font-heading font-bold">{rollResult}</span>
            </span>
            {skill.is_single_use && (
              <span className="text-xs text-muted-foreground ml-auto">Used!</span>
            )}
          </div>
        </div>
      )}

      {/* Expanded description */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-1.5">
          {skill.description ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{skill.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No description.</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {weapon && weapon !== 'any' && (
              <span className="text-[10px] bg-secondary rounded px-2 py-0.5 text-muted-foreground capitalize">
                {weapon.replace('_', ' ')}
              </span>
            )}
            {diceName && (
              <span className="text-[10px] bg-secondary rounded px-2 py-0.5 text-muted-foreground">
                {diceName} damage
              </span>
            )}
            {skill.stat_bonuses && Object.entries(skill.stat_bonuses).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-accent/10 text-accent rounded px-2 py-0.5">
                +{v} {k.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}