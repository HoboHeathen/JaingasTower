import React, { useState, useRef } from 'react';
import { Swords, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dices, Zap } from 'lucide-react';

// ── Dice helpers (duplicated from SkillList for self-containment) ─────────────
const WEAPON_DICE = { dagger: 'd4', shortbow: 'd4', sword: 'd6', axe: 'd8', light_crossbow: 'd6', polearm: 'd8', longbow: 'd8', heavy_crossbow: 'd8', hammer: 'd10', greathammer: 'd12', any: 'd6' };
const GREAT_WEAPON_TREE_DICE = { greatsword: 'd12', greathammer: 'd12', greataxe: 'd12' };
const MAGIC_DICE_PROGRESSION = ['d4', 'd6', 'd8', 'd10', 'd12'];
const ELEMENT_KEYS = ['fire', 'frost', 'lightning', 'necrotic', 'healing'];
const ATTACK_WEIGHT_DICE_COUNT = { light: 1, medium: 2, heavy: 3 };

function getDiceString(node, magicDice = {}) {
  const weight = node.attack_sub_category;
  if (!weight) return null;
  const count = ATTACK_WEIGHT_DICE_COUNT[weight] || 1;
  if (node.treeCategory === 'spells') {
    const treeName = (node.treeName || '').toLowerCase();
    for (const element of ELEMENT_KEYS) {
      if (treeName.includes(element)) {
        const idx = magicDice[element] ?? 0;
        const die = MAGIC_DICE_PROGRESSION[Math.min(idx, MAGIC_DICE_PROGRESSION.length - 1)];
        return `${count}${die}`;
      }
    }
    return `${count}d4`;
  }
  const treeNameLower = (node.treeName || '').toLowerCase();
  for (const [tn, die] of Object.entries(GREAT_WEAPON_TREE_DICE)) {
    if (treeNameLower.includes(tn)) return `${count}${die}`;
  }
  return `${count}${WEAPON_DICE[node.weapon_required] || 'd6'}`;
}

function rollDice(diceStr) {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) return null;
  const [, count, sides] = match.map(Number);
  let total = 0; const rolls = [];
  for (let i = 0; i < count; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); total += r; }
  return { total, rolls, diceStr };
}

const isPowerAttack = (skill) => /^power attack/i.test(skill.name);
const isCharge = (skill) => /^charge (i|ii|iii)$/i.test(skill.name);

const weightOrder = { heavy: 3, medium: 2, light: 1 };
const WEAPON_TREE_NAMES = ['polearm', 'axe', 'hammer', 'greataxe', 'greatsword', 'greathammer', 'sword', 'dagger', 'shortbow', 'longbow', 'light crossbow', 'heavy crossbow'];
function isMainChainSkill(skill) {
  if (skill.node_type === 'skill') return false;
  const nameLower = skill.name.toLowerCase();
  return WEAPON_TREE_NAMES.some((w) => nameLower.startsWith(w + ' ') && /\s[ivxlcdm]+$/i.test(skill.name));
}

// ── Mini skill card ────────────────────────────────────────────────────────────
function MiniSkillCard({ skill, isUsed, onMarkUsed, magicDice, chargePool, chargeLimit, onCharge, onDeplete, onShareRoll }) {
  const [rollResult, setRollResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const baseDiceStr = getDiceString(skill, magicDice);
  const isPA = isPowerAttack(skill);
  const isCh = isCharge(skill);

  const diceStr = isPA && chargePool > 0 && baseDiceStr
    ? (() => { const m = baseDiceStr.match(/^(\d+)(d\d+)$/); return m ? `${parseInt(m[1]) + chargePool}${m[2]}` : baseDiceStr; })()
    : baseDiceStr;

  const handleRoll = (e) => {
    e.stopPropagation();
    if (!diceStr || isRolling) return;
    if (isPA && chargePool <= 0) { toast.warning('Charge pool empty!'); return; }
    setIsRolling(true); setRollResult(null);
    setTimeout(() => {
      const result = rollDice(diceStr);
      setRollResult(result); setIsRolling(false);
      if (isPA && onDeplete) onDeplete();
      if (skill.is_single_use && !isUsed) onMarkUsed(skill.id);
      if (onShareRoll && result) onShareRoll(`${skill.name}: [${result.rolls.join(', ')}] = ${result.total}`);
    }, 400);
  };

  const weightColor = { heavy: 'text-red-400 border-red-400/40', medium: 'text-orange-400 border-orange-400/40', light: 'text-yellow-400 border-yellow-400/40' };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border transition-all', isUsed ? 'opacity-40 border-border/20 bg-secondary/5' : 'border-border/40 bg-secondary/20 hover:bg-secondary/40')}>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isUsed && 'line-through text-muted-foreground')}>{skill.name}</p>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {skill.attack_sub_category && (
            <Badge variant="outline" className={cn('text-[10px] py-0 px-1', weightColor[skill.attack_sub_category] || 'text-muted-foreground')}>{skill.attack_sub_category}</Badge>
          )}
          {diceStr && <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground font-mono">{diceStr}</Badge>}
          {skill.is_single_use && <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">1×</Badge>}
          {isPA && chargePool > 0 && <Badge variant="outline" className="text-[10px] py-0 px-1 text-primary"><Zap className="w-2 h-2 inline mr-0.5" />{chargePool}</Badge>}
        </div>
      </div>
      <div className="shrink-0">
        {isCh ? (
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); if (chargePool >= chargeLimit) { toast.warning('Pool full!'); return; } onCharge?.(); }}>
            <Zap className="w-3 h-3" /> Charge
          </Button>
        ) : diceStr && !isUsed ? (
          <Button size="icon" variant="ghost" className={cn('h-8 w-8', isPA && chargePool > 0 && 'text-primary', isRolling && 'animate-spin')}
            onClick={handleRoll} disabled={isRolling} title={`Roll ${diceStr}`}>
            <Dices className="w-4 h-4" />
          </Button>
        ) : null}
      </div>
      {rollResult && (
        <div className="absolute left-0 right-0 -bottom-6 text-center text-xs text-primary font-bold pointer-events-none z-10">
          🎲 {rollResult.total}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function VttActionsPanel({ character, trees = [], racialTrees = [], onUpdateCharacter }) {
  const [open, setOpen] = useState(false);
  // For mobile sheet drag
  const dragStartY = useRef(null);

  if (!character) return null;

  // Build skills from character
  const unlockedSkills = character.unlocked_skills || [];
  const usedSingleUseSkills = character.used_single_use_skills || [];
  const treeMap = {}; trees.forEach((t) => { treeMap[t.id] = t; });
  const racialTreeMap = {}; racialTrees.forEach((t) => { racialTreeMap[t.id] = t; });

  const allActions = [];
  unlockedSkills.forEach(({ tree_id, node_id }) => {
    const tree = treeMap[tree_id]; if (!tree) return;
    const node = (tree.nodes || []).find((n) => n.id === node_id); if (!node) return;
    if (node.node_type === 'stat_increase' || node.node_type === 'augment') return;
    allActions.push({ ...node, treeId: tree.id, treeName: tree.name, treeCategory: tree.tree_category });
  });
  // Racial skills
  (character.unlocked_racial_skills || []).forEach(({ racial_tree_id, node_id }) => {
    const tree = racialTreeMap[racial_tree_id]; if (!tree) return;
    const node = (tree.nodes || []).find((n) => n.id === node_id); if (!node) return;
    if (node.category === 'passive') return;
    allActions.push({ ...node, treeId: tree.id, treeName: tree.tree_name, treeCategory: 'racial' });
  });

  // Deduplicate main chain weapon skills
  const mainChain = allActions.filter(isMainChainSkill);
  const nonMain = allActions.filter((s) => !isMainChainSkill(s));
  const seen = new Map();
  mainChain.forEach((skill) => {
    const key = skill.weapon_required || 'any';
    const existing = seen.get(key);
    const cw = weightOrder[skill.attack_sub_category] || 0;
    const ew = existing ? (weightOrder[existing.attack_sub_category] || 0) : -1;
    if (!existing || cw > ew) seen.set(key, skill);
  });
  const skills = [...seen.values(), ...nonMain];

  const magicDice = {
    fire: character.fire_dice_index ?? 0, frost: character.frost_dice_index ?? 0,
    lightning: character.lightning_dice_index ?? 0, necrotic: character.necrotic_dice_index ?? 0,
    healing: character.healing_dice_index ?? 0,
  };
  const chargePool = character.charge_pool_current ?? 0;
  const chargeLimit = character.charge_pool_limit ?? 0;

  const handleMarkUsed = (nodeId) => {
    const updated = [...usedSingleUseSkills];
    if (!updated.includes(nodeId)) updated.push(nodeId);
    onUpdateCharacter?.({ used_single_use_skills: updated });
  };
  const handleCharge = () => { if (chargePool < chargeLimit) onUpdateCharacter?.({ charge_pool_current: chargePool + 1 }); };
  const handleDeplete = () => { onUpdateCharacter?.({ charge_pool_current: 0 }); };

  // Touch drag to dismiss on mobile
  const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (dragStartY.current !== null) {
      const dy = e.changedTouches[0].clientY - dragStartY.current;
      if (dy > 60) setOpen(false);
      dragStartY.current = null;
    }
  };

  return (
    <>
      {/* Trigger button — fixed over the canvas bottom-left */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-card/90 border border-border/60 text-foreground text-xs font-medium px-3 py-2 rounded-full shadow-lg backdrop-blur-sm hover:bg-secondary/80 transition-all active:scale-95"
      >
        <Swords className="w-3.5 h-3.5 text-primary" />
        Actions
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronUp className="w-3 h-3 text-muted-foreground" />}
      </button>

      {/* Panel — shown when open */}
      {open && (
        <>
          {/* Mobile: bottom sheet overlay */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              // Mobile: full-width bottom sheet
              'fixed bottom-0 left-0 right-0 z-50 sm:hidden',
              'bg-card border-t border-border rounded-t-2xl shadow-2xl',
              'max-h-[75vh] flex flex-col'
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-primary" /> {character.name} – Actions
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-6 space-y-2 flex-1">
              {skills.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-6">No actions unlocked.</p>
                : skills.map((skill) => (
                  <MiniSkillCard key={skill.id} skill={skill} isUsed={usedSingleUseSkills.includes(skill.id)}
                    onMarkUsed={handleMarkUsed} magicDice={magicDice} chargePool={chargePool} chargeLimit={chargeLimit}
                    onCharge={handleCharge} onDeplete={handleDeplete} />
                ))}
            </div>
          </div>

          {/* Desktop: inline collapsible panel */}
          <div className="hidden sm:block absolute bottom-full mb-2 left-0 w-80 max-h-96 overflow-y-auto bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl shadow-2xl z-50 p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Swords className="w-3 h-3 text-primary" /> {character.name} – Actions
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {skills.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">No actions unlocked.</p>
              : skills.map((skill) => (
                <MiniSkillCard key={skill.id} skill={skill} isUsed={usedSingleUseSkills.includes(skill.id)}
                  onMarkUsed={handleMarkUsed} magicDice={magicDice} chargePool={chargePool} chargeLimit={chargeLimit}
                  onCharge={handleCharge} onDeplete={handleDeplete} />
              ))}
          </div>
        </>
      )}
    </>
  );
}