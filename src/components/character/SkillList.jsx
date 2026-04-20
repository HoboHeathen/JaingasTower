import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dices, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WEAPON_DICE = {
  dagger: 'd4',
  shortbow: 'd4',
  sword: 'd6',
  axe: 'd8',
  light_crossbow: 'd6',
  polearm: 'd8',
  longbow: 'd8',
  heavy_crossbow: 'd8',
  hammer: 'd10',
  greathammer: 'd12',
  any: 'd6',
};

// Some weapon_required values are shared between regular and great weapons.
// Use the tree name to override the die for great weapon trees.
const GREAT_WEAPON_TREE_DICE = {
  greatsword: 'd12',
  greathammer: 'd12',
  greataxe: 'd12',
};

const MAGIC_DICE_PROGRESSION = ['d4', 'd6', 'd8', 'd10', 'd12'];

// Elements keyed by how they might appear in tree names
const ELEMENT_KEYS = ['fire', 'frost', 'lightning', 'necrotic', 'healing'];

const ATTACK_WEIGHT_DICE_COUNT = { light: 1, medium: 2, heavy: 3 };

const categoryLabel = { primary: 'Primary', secondary: 'Secondary', tertiary: 'Tertiary', reactionary: 'Reactionary' };
const categoryColor = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  secondary: 'bg-accent/10 text-accent-foreground border-accent/30',
  tertiary: 'bg-chart-3/10 text-foreground border-chart-3/30',
  reactionary: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

function getDiceString(node, magicDice = {}) {
  const weight = node.attack_sub_category;
  if (!weight) return null;
  const count = ATTACK_WEIGHT_DICE_COUNT[weight] || 1;

  // Spell trees use magic dice progression per element
  if (node.treeCategory === 'spells') {
    // Detect element from tree name
    const treeName = (node.treeName || '').toLowerCase();
    for (const element of ELEMENT_KEYS) {
      if (treeName.includes(element)) {
        const idx = magicDice[element] ?? 0;
        const die = MAGIC_DICE_PROGRESSION[Math.min(idx, MAGIC_DICE_PROGRESSION.length - 1)];
        return `${count}${die}`;
      }
    }
    // Generic spell — use d4 base
    return `${count}d4`;
  }

  // Check if this node comes from a great weapon tree (override the die)
  const treeNameLower = (node.treeName || '').toLowerCase();
  for (const [treeName, die] of Object.entries(GREAT_WEAPON_TREE_DICE)) {
    if (treeNameLower.includes(treeName)) return `${count}${die}`;
  }
  const die = WEAPON_DICE[node.weapon_required] || 'd6';
  return `${count}${die}`;
}

function rollDice(diceStr) {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) return null;
  const [, count, sides] = match.map(Number);
  let total = 0;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }
  return { total, rolls, diceStr };
}

const isPowerAttack = (skill) => /^power attack/i.test(skill.name);
const isCharge = (skill) => /^charge (i|ii|iii)$/i.test(skill.name);

function SkillCard({ skill, isUsed, onMarkUsed, magicDice, chargePool = 0, chargeLimit = 0, onCharge, onDeplete, onShareRoll }) {
  const [rollResult, setRollResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const baseDiceStr = getDiceString(skill, magicDice);
  const isPA = isPowerAttack(skill);
  const isCh = isCharge(skill);

  // For Power Attacks, build an extended dice string including pool dice
  const getDiceStringWithPool = () => {
    if (!isPA || chargePool <= 0 || !baseDiceStr) return baseDiceStr;
    const match = baseDiceStr.match(/^(\d+)(d\d+)$/);
    if (!match) return baseDiceStr;
    return `${parseInt(match[1]) + chargePool}${match[2]}`;
  };

  const diceStr = getDiceStringWithPool();

  const handleCharge = (e) => {
    e.stopPropagation();
    if (chargePool >= chargeLimit) {
      toast.warning('Charge pool is already full!');
      return;
    }
    if (onCharge) onCharge();
  };

  const handleRoll = (e) => {
    e.stopPropagation();
    if (!diceStr || isRolling) return;
    if (isPA && chargePool <= 0) {
      toast.warning('Charge pool is empty! Use Charge I/II/III first.');
      return;
    }
    setIsRolling(true);
    setRollResult(null);
    setTimeout(() => {
      const result = rollDice(diceStr);
      setRollResult(result);
      setIsRolling(false);
      if (isPA && onDeplete) onDeplete();
      if (skill.is_single_use && !isUsed) onMarkUsed(skill.id);
      if (onShareRoll && result) {
        onShareRoll(`${skill.name} (${skill.attack_sub_category || 'skill'}): [${result.rolls.join(', ')}] = ${result.total}`);
      }
    }, 500);
  };

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 transition-all',
        isUsed
          ? 'opacity-40 border-border/30 bg-secondary/10'
          : 'border-border/40 bg-secondary/30 hover:bg-secondary/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', isUsed && 'line-through text-muted-foreground')}>
            {skill.name}
          </p>
          {skill.treeName && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{skill.treeName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {skill.attack_sub_category && (
              <Badge variant="outline" className={cn('text-[10px] py-0',
                skill.attack_sub_category === 'heavy' ? 'text-red-400 border-red-400/40' :
                skill.attack_sub_category === 'medium' ? 'text-orange-400 border-orange-400/40' :
                'text-yellow-400 border-yellow-400/40'
              )}>
                {skill.attack_sub_category}
              </Badge>
            )}
            {skill.weapon_required && skill.weapon_required !== 'any' && (
              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                {skill.weapon_required}
              </Badge>
            )}
            {skill.is_single_use && (
              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                1×
              </Badge>
            )}
          </div>
          {skill.description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {skill.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isPA && (
            <span className={cn(
              'text-[10px] font-semibold flex items-center gap-0.5',
              chargePool > 0 ? 'text-primary' : 'text-muted-foreground/50'
            )}>
              <Zap className="w-2.5 h-2.5" />{chargePool}
            </span>
          )}
          {isCh && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
              onClick={handleCharge}
              title="Add a die to the charge pool"
            >
              <Zap className="w-3 h-3" /> Charge
            </Button>
          )}
          {!isCh && diceStr && !isUsed && (
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-7 w-7', isPA && chargePool > 0 && 'text-primary', isRolling && 'animate-spin')}
              onClick={handleRoll}
              title={`Roll ${diceStr}`}
              disabled={isRolling}
            >
              <Dices className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {rollResult && (
        <div className="mt-2 text-xs text-primary font-semibold">
          🎲 {rollResult.diceStr}: [{rollResult.rolls.join(', ')}] = {rollResult.total}
        </div>
      )}
    </div>
  );
}

// Main-chain skills are named like "Polearm I", "Axe III", "Hammer V" etc.
// They are the basic weapon attacks that get deduplicated (keep highest weight per weapon).
// Augments (Sweep, Chasedown, Dazed, etc.) always show.
const WEAPON_TREE_NAMES = ['polearm', 'axe', 'hammer', 'greataxe', 'greatsword', 'greathammer', 'sword', 'dagger', 'shortbow', 'longbow', 'light crossbow', 'heavy crossbow'];

function isMainChainSkill(skill) {
  if (skill.node_type === 'skill') return false;
  const nameLower = skill.name.toLowerCase();
  return WEAPON_TREE_NAMES.some((w) => nameLower.startsWith(w + ' ') && /\s[ivxlcdm]+$/i.test(skill.name));
}


export default function SkillList({ category, skills, usedSkills = [], onMarkUsed, magicDice = {}, chargePool = 0, chargeLimit = 0, onCharge, onDeplete, onShareRoll }) {
  const weightOrder = { heavy: 3, medium: 2, light: 1 };

  const mainChain = skills.filter(isMainChainSkill);
  const nonMain = skills.filter((s) => !isMainChainSkill(s) && s.node_type !== 'augment');

  // Deduplicate main-chain: keep only highest attack weight per weapon
  const seen = new Map();
  mainChain.forEach((skill) => {
    const key = skill.weapon_required || 'any';
    const existing = seen.get(key);
    const currentWeight = weightOrder[skill.attack_sub_category] || 0;
    const existingWeight = existing ? (weightOrder[existing.attack_sub_category] || 0) : -1;
    if (!existing || currentWeight > existingWeight) seen.set(key, skill);
  });

  const deduped = [...seen.values(), ...nonMain];

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <h3 className={cn('text-sm font-heading font-semibold mb-3', categoryColor[category].split(' ')[1])}>
        {categoryLabel[category]} Actions
      </h3>
      {deduped.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No {category} actions unlocked.</p>
      ) : (
        <div className="space-y-2">
          {deduped.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isUsed={usedSkills.includes(skill.id)}
              onMarkUsed={onMarkUsed}
              magicDice={magicDice}
              chargePool={chargePool}
              chargeLimit={chargeLimit}
              onCharge={onCharge}
              onDeplete={onDeplete}
              onShareRoll={onShareRoll}
            />
          ))}
        </div>
      )}
    </div>
  );
}