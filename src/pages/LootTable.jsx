import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Dices, Plus, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AddToInventoryModal from '@/components/inventory/AddToInventoryModal';

const LOOT_DATA = [
  { roll_min: 1, roll_max: 1, result_label: 'Light Health Potion' },
  { roll_min: 2, roll_max: 2, result_label: 'Consumable Type Component' },
  { roll_min: 3, roll_max: 3, result_label: '50gp', gold_amount: 50 },
  { roll_min: 4, roll_max: 4, result_label: '1d Fire Damage Effect Component' },
  { roll_min: 5, roll_max: 5, result_label: 'Medium Health Potion' },
  { roll_min: 6, roll_max: 6, result_label: '100gp', gold_amount: 100 },
  { roll_min: 7, roll_max: 7, result_label: 'Medium Health Potion' },
  { roll_min: 8, roll_max: 8, result_label: 'Weapon Target Component' },
  { roll_min: 9, roll_max: 9, result_label: '150gp', gold_amount: 150 },
  { roll_min: 10, roll_max: 10, result_label: 'Heavy Health Potion' },
  { roll_min: 11, roll_max: 11, result_label: 'Consumable Type Component' },
  { roll_min: 12, roll_max: 12, result_label: '200gp', gold_amount: 200 },
  { roll_min: 13, roll_max: 13, result_label: 'Defense Target Component' },
  { roll_min: 14, roll_max: 14, result_label: 'Restore Effect Component' },
  { roll_min: 15, roll_max: 15, result_label: '250gp', gold_amount: 250 },
  { roll_min: 16, roll_max: 16, result_label: 'Upgrade I Type Component' },
  { roll_min: 17, roll_max: 17, result_label: 'Speed Target Component' },
  { roll_min: 18, roll_max: 18, result_label: '300gp', gold_amount: 300 },
  { roll_min: 19, roll_max: 19, result_label: 'Consumable Type Component' },
  { roll_min: 20, roll_max: 20, result_label: 'Heavy Attack Target Component' },
  { roll_min: 21, roll_max: 21, result_label: '350gp', gold_amount: 350 },
  { roll_min: 22, roll_max: 22, result_label: 'Upgrade I Type Component' },
  { roll_min: 23, roll_max: 23, result_label: 'Damage Roll Target Component' },
  { roll_min: 24, roll_max: 24, result_label: '400gp', gold_amount: 400 },
  { roll_min: 25, roll_max: 25, result_label: '1d Poison Effect Component' },
  { roll_min: 26, roll_max: 26, result_label: 'Contest Roll Target Component' },
  { roll_min: 27, roll_max: 27, result_label: '450gp', gold_amount: 450 },
  { roll_min: 28, roll_max: 28, result_label: 'Primary Action Target Component' },
  { roll_min: 29, roll_max: 29, result_label: 'Consumable Type Component' },
  { roll_min: 30, roll_max: 30, result_label: '500gp', gold_amount: 500 },
  { roll_min: 31, roll_max: 31, result_label: 'Fire Damage Effect Component' },
  { roll_min: 32, roll_max: 32, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 33, roll_max: 33, result_label: '550gp', gold_amount: 550 },
  { roll_min: 34, roll_max: 34, result_label: 'Medium Attack Target Component' },
  { roll_min: 35, roll_max: 35, result_label: 'Consumable Type Component' },
  { roll_min: 36, roll_max: 36, result_label: '600gp', gold_amount: 600 },
  { roll_min: 37, roll_max: 37, result_label: 'Restore Effect Component' },
  { roll_min: 38, roll_max: 38, result_label: 'Poison Damage Effect Component' },
  { roll_min: 39, roll_max: 39, result_label: '650gp', gold_amount: 650 },
  { roll_min: 40, roll_max: 40, result_label: 'Weapon Target Component' },
  { roll_min: 41, roll_max: 41, result_label: 'Light Attack Target Component' },
  { roll_min: 42, roll_max: 42, result_label: '700gp', gold_amount: 700 },
  { roll_min: 43, roll_max: 43, result_label: 'Consumable Type Component' },
  { roll_min: 44, roll_max: 44, result_label: '1d Frost Damage Effect Component' },
  { roll_min: 45, roll_max: 45, result_label: '750gp', gold_amount: 750 },
  { roll_min: 46, roll_max: 46, result_label: 'Attack Roll Target Component' },
  { roll_min: 47, roll_max: 47, result_label: 'Consumable Type Component' },
  { roll_min: 48, roll_max: 48, result_label: '800gp', gold_amount: 800 },
  { roll_min: 49, roll_max: 49, result_label: 'Fire Damage Effect Component' },
  { roll_min: 50, roll_max: 50, result_label: 'Consumable Type Component' },
  { roll_min: 51, roll_max: 51, result_label: '850gp', gold_amount: 850 },
  { roll_min: 52, roll_max: 52, result_label: 'Lightning Damage Effect Component' },
  { roll_min: 53, roll_max: 53, result_label: 'Consumable Type Component' },
  { roll_min: 54, roll_max: 54, result_label: '900gp', gold_amount: 900 },
  { roll_min: 55, roll_max: 55, result_label: 'Double Effect Component' },
  { roll_min: 56, roll_max: 56, result_label: 'Frost Damage Effect Component' },
  { roll_min: 57, roll_max: 57, result_label: '950gp', gold_amount: 950 },
  { roll_min: 58, roll_max: 58, result_label: 'Consumable Type Component' },
  { roll_min: 59, roll_max: 59, result_label: 'Poison Damage Effect Component' },
  { roll_min: 60, roll_max: 60, result_label: '1000gp', gold_amount: 1000 },
  { roll_min: 61, roll_max: 61, result_label: 'Secondary Action Target Component' },
  { roll_min: 62, roll_max: 62, result_label: 'Upgrade II Type Component' },
  { roll_min: 63, roll_max: 63, result_label: '1050gp', gold_amount: 1050 },
  { roll_min: 64, roll_max: 64, result_label: 'Restore Effect Component' },
  { roll_min: 65, roll_max: 65, result_label: 'Move Action Target Component' },
  { roll_min: 66, roll_max: 66, result_label: '1100gp', gold_amount: 1100 },
  { roll_min: 67, roll_max: 67, result_label: 'Double Effect Component' },
  { roll_min: 68, roll_max: 68, result_label: 'Consumable Type Component' },
  { roll_min: 69, roll_max: 69, result_label: '1150gp', gold_amount: 1150 },
  { roll_min: 70, roll_max: 70, result_label: 'Upgrade II Type Component' },
  { roll_min: 71, roll_max: 71, result_label: 'Poison Damage Target Component' },
  { roll_min: 72, roll_max: 72, result_label: '1200gp', gold_amount: 1200 },
  { roll_min: 73, roll_max: 73, result_label: 'Extra Die Effect Component' },
  { roll_min: 74, roll_max: 74, result_label: 'Speed Target Component' },
  { roll_min: 75, roll_max: 75, result_label: '1250gp', gold_amount: 1250 },
  { roll_min: 76, roll_max: 76, result_label: 'Upgrade II Type Component' },
  { roll_min: 77, roll_max: 77, result_label: 'Fire Damage Target Component' },
  { roll_min: 78, roll_max: 78, result_label: '1300gp', gold_amount: 1300 },
  { roll_min: 79, roll_max: 79, result_label: 'Consumable Type Component' },
  { roll_min: 80, roll_max: 80, result_label: '1350gp', gold_amount: 1350 },
  { roll_min: 81, roll_max: 81, result_label: 'Upgrade II Type Component' },
  { roll_min: 82, roll_max: 82, result_label: '1d Lightning Damage Effect Component' },
  { roll_min: 83, roll_max: 83, result_label: '1400gp', gold_amount: 1400 },
  { roll_min: 84, roll_max: 84, result_label: 'Attack Roll Target Component' },
  { roll_min: 85, roll_max: 85, result_label: 'Secondary Action Target Component' },
  { roll_min: 86, roll_max: 86, result_label: '1450gp', gold_amount: 1450 },
  { roll_min: 87, roll_max: 87, result_label: 'Upgrade II Type Component' },
  { roll_min: 88, roll_max: 88, result_label: 'Poison Damage Effect Component' },
  { roll_min: 89, roll_max: 89, result_label: '1500gp', gold_amount: 1500 },
  { roll_min: 90, roll_max: 90, result_label: 'Lightning Damage Target Component' },
  { roll_min: 91, roll_max: 91, result_label: 'Consumable Type Component' },
  { roll_min: 92, roll_max: 92, result_label: '1550gp', gold_amount: 1550 },
  { roll_min: 93, roll_max: 93, result_label: 'Reroll Effect Component' },
  { roll_min: 94, roll_max: 94, result_label: 'Tertiary Action Target Component' },
  { roll_min: 95, roll_max: 95, result_label: '1600gp', gold_amount: 1600 },
  { roll_min: 96, roll_max: 96, result_label: 'Extra Die Effect Component' },
  { roll_min: 97, roll_max: 97, result_label: 'Defense Target Component' },
  { roll_min: 98, roll_max: 98, result_label: '1650gp', gold_amount: 1650 },
  { roll_min: 99, roll_max: 99, result_label: 'Triple Effect Component' },
  { roll_min: 100, roll_max: 100, result_label: 'Consumable Type Component' },
  { roll_min: 101, roll_max: 101, result_label: '1700gp', gold_amount: 1700 },
  { roll_min: 102, roll_max: 102, result_label: 'Frost Damage Target Component' },
  { roll_min: 103, roll_max: 103, result_label: 'Speed Target Component' },
  { roll_min: 104, roll_max: 104, result_label: '1750gp', gold_amount: 1750 },
  { roll_min: 105, roll_max: 105, result_label: 'Consumable Type Component' },
  { roll_min: 106, roll_max: 106, result_label: '1d Poison Effect Component' },
  { roll_min: 107, roll_max: 107, result_label: '1800gp', gold_amount: 1800 },
  { roll_min: 108, roll_max: 108, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 109, roll_max: 109, result_label: 'Move Action Target Component' },
  { roll_min: 110, roll_max: 110, result_label: '1850gp', gold_amount: 1850 },
  { roll_min: 111, roll_max: 111, result_label: 'Restore Effect Component' },
  { roll_min: 112, roll_max: 112, result_label: 'Contest Roll Target Component' },
  { roll_min: 113, roll_max: 113, result_label: '1900gp', gold_amount: 1900 },
  { roll_min: 114, roll_max: 114, result_label: '1d Lightning Damage Effect Component' },
  { roll_min: 115, roll_max: 115, result_label: 'Consumable Type Component' },
  { roll_min: 116, roll_max: 116, result_label: '1950gp', gold_amount: 1950 },
  { roll_min: 117, roll_max: 117, result_label: 'Weapon Target Component' },
  { roll_min: 118, roll_max: 118, result_label: 'Damage Roll Target Component' },
  { roll_min: 119, roll_max: 119, result_label: '2000gp', gold_amount: 2000 },
  { roll_min: 120, roll_max: 120, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 121, roll_max: 121, result_label: 'Upgrade III Type Component' },
  { roll_min: 122, roll_max: 122, result_label: 'Damage Roll Target Component' },
  { roll_min: 123, roll_max: 123, result_label: '2050gp', gold_amount: 2050 },
  { roll_min: 124, roll_max: 124, result_label: 'Upgrade III Type Component' },
  { roll_min: 125, roll_max: 125, result_label: 'Consumable Type Component' },
  { roll_min: 126, roll_max: 126, result_label: '2100gp', gold_amount: 2100 },
  { roll_min: 127, roll_max: 127, result_label: 'Lightning Damage Effect Component' },
  { roll_min: 128, roll_max: 128, result_label: '1d Frost Damage Effect Component' },
  { roll_min: 129, roll_max: 129, result_label: '2150gp', gold_amount: 2150 },
  { roll_min: 130, roll_max: 130, result_label: 'Upgrade III Type Component' },
  { roll_min: 131, roll_max: 131, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 132, roll_max: 132, result_label: '2200gp', gold_amount: 2200 },
  { roll_min: 133, roll_max: 133, result_label: 'Triple Effect Component' },
  { roll_min: 134, roll_max: 134, result_label: 'Consumable Type Component' },
  { roll_min: 135, roll_max: 135, result_label: '2250gp', gold_amount: 2250 },
  { roll_min: 136, roll_max: 136, result_label: 'Upgrade III Type Component' },
  { roll_min: 137, roll_max: 137, result_label: 'Weapon Target Component' },
  { roll_min: 138, roll_max: 138, result_label: '2300gp', gold_amount: 2300 },
  { roll_min: 139, roll_max: 139, result_label: 'Reroll Effect Component' },
  { roll_min: 140, roll_max: 140, result_label: '2350gp', gold_amount: 2350 },
  { roll_min: 141, roll_max: 141, result_label: 'Upgrade III Type Component' },
  { roll_min: 142, roll_max: 142, result_label: 'Defense Target Component' },
  { roll_min: 143, roll_max: 143, result_label: '2400gp', gold_amount: 2400 },
  { roll_min: 144, roll_max: 144, result_label: 'Consumable Type Component' },
  { roll_min: 145, roll_max: 145, result_label: 'Primary Action Target Component' },
  { roll_min: 146, roll_max: 146, result_label: '2450gp', gold_amount: 2450 },
  { roll_min: 147, roll_max: 147, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 148, roll_max: 148, result_label: 'Damage Roll Target Component' },
  { roll_min: 149, roll_max: 149, result_label: '2500gp', gold_amount: 2500 },
  { roll_min: 150, roll_max: 150, result_label: 'Consumable Type Component' },
  { roll_min: 151, roll_max: 151, result_label: 'Extra Die Effect Component' },
  { roll_min: 152, roll_max: 152, result_label: '2550gp', gold_amount: 2550 },
  { roll_min: 153, roll_max: 153, result_label: '1d Fire Damage Effect Component' },
  { roll_min: 154, roll_max: 154, result_label: 'Move Action Target Component' },
  { roll_min: 155, roll_max: 155, result_label: '2600gp', gold_amount: 2600 },
  { roll_min: 156, roll_max: 156, result_label: 'Consumable Type Component' },
  { roll_min: 157, roll_max: 157, result_label: 'Lightning Damage Effect Component' },
  { roll_min: 158, roll_max: 158, result_label: '2650gp', gold_amount: 2650 },
  { roll_min: 159, roll_max: 159, result_label: 'Consumable Type Component' },
  { roll_min: 160, roll_max: 160, result_label: '2700gp', gold_amount: 2700 },
  { roll_min: 161, roll_max: 161, result_label: 'Frost Damage Effect Component' },
  { roll_min: 162, roll_max: 162, result_label: 'Skill Point', skill_points: 1 },
  { roll_min: 163, roll_max: 163, result_label: '2750gp', gold_amount: 2750 },
  { roll_min: 164, roll_max: 164, result_label: 'Consumable Type Component' },
  { roll_min: 165, roll_max: 165, result_label: 'Tertiary Action Target Component' },
  { roll_min: 166, roll_max: 166, result_label: '2800gp', gold_amount: 2800 },
  { roll_min: 167, roll_max: 167, result_label: 'Consumable Type Component' },
  { roll_min: 168, roll_max: 168, result_label: 'Weapon Target Component' },
  { roll_min: 169, roll_max: 169, result_label: '2850gp', gold_amount: 2850 },
  { roll_min: 170, roll_max: 170, result_label: 'Damage Roll Target Component' },
  { roll_min: 171, roll_max: 171, result_label: 'Consumable Type Component' },
  { roll_min: 172, roll_max: 172, result_label: '2900gp', gold_amount: 2900 },
  { roll_min: 173, roll_max: 173, result_label: 'Restore Effect Component' },
  { roll_min: 174, roll_max: 174, result_label: 'Speed Target Component' },
  { roll_min: 175, roll_max: 175, result_label: '2950gp', gold_amount: 2950 },
  { roll_min: 176, roll_max: 176, result_label: 'Consumable Type Component' },
  { roll_min: 177, roll_max: 177, result_label: 'Extra Die Effect Component' },
  { roll_min: 178, roll_max: 178, result_label: '3000gp', gold_amount: 3000 },
  { roll_min: 179, roll_max: 179, result_label: 'Extra Life Totem' },
  { roll_min: 180, roll_max: 999, result_label: '10 Skill Points', skill_points: 10 },
];

function getResultType(entry) {
  if (entry.gold_amount) return 'gold';
  if (entry.skill_points) return 'skill_points';
  if (entry.result_label.includes('Type Component')) return 'type';
  if (entry.result_label.includes('Target Component')) return 'target';
  if (entry.result_label.includes('Effect Component')) return 'effect';
  if (entry.result_label.includes('Potion') || entry.result_label.includes('Totem')) return 'consumable';
  return 'other';
}

const TYPE_STYLES = {
  gold: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  skill_points: 'bg-chart-2/10 border-chart-2/30 text-foreground',
  type: 'bg-primary/10 border-primary/30 text-primary',
  target: 'bg-accent/10 border-accent/30 text-accent-foreground',
  effect: 'bg-chart-3/10 border-chart-3/30 text-foreground',
  consumable: 'bg-green-500/10 border-green-500/30 text-green-300',
  other: 'bg-secondary border-border text-muted-foreground',
};

const TYPE_BADGE = {
  gold: 'Gold',
  skill_points: 'SP',
  type: 'Type',
  target: 'Target',
  effect: 'Effect',
  consumable: 'Item',
  other: '—',
};

export default function LootTable() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [rollInput, setRollInput] = useState('');
  const [rolledResult, setRolledResult] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const filtered = useMemo(() => {
    return LOOT_DATA.filter((entry) => {
      const matchSearch = !search.trim() || entry.result_label.toLowerCase().includes(search.toLowerCase());
      const type = getResultType(entry);
      const matchFilter = filter === 'all' || type === filter;
      return matchSearch && matchFilter;
    });
  }, [search, filter]);

  // Parse dice formula: "3d6+2", "2d10 - 4", "d20", "15", etc.
  const rollFormula = (formula) => {
    if (!formula.trim()) return Math.floor(Math.random() * 180) + 1;
    const clean = formula.replace(/\s/g, '').toLowerCase();
    // Check if it's a plain number
    if (/^\d+$/.test(clean)) return parseInt(clean);
    // Match NdM+K pattern
    const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) return NaN;
    const count = parseInt(match[1] || '1');
    const faces = parseInt(match[2]);
    const modifier = parseInt(match[3] || '0');
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.floor(Math.random() * faces) + 1;
    return total + modifier;
  };

  const handleRoll = () => {
    const roll = rollFormula(rollInput);
    if (isNaN(roll)) { toast.error('Invalid formula. Try: 3d6+2, d20, or just a number.'); return; }
    const result = LOOT_DATA.find((e) => roll >= e.roll_min && roll <= e.roll_max);
    setRolledResult({ roll, result: result || { result_label: 'No result found' } });
  };

  const FILTERS = ['all', 'gold', 'skill_points', 'type', 'target', 'effect', 'consumable'];
  const FILTER_LABELS = { all: 'All', gold: 'Gold', skill_points: 'Skill Pts', type: 'Type', target: 'Target', effect: 'Effect', consumable: 'Items' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Loot Table</h1>
        <p className="text-sm text-muted-foreground">Roll for loot rewards or browse all possible outcomes.</p>
      </div>

      {/* Roller */}
      <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
        <h2 className="font-heading text-base font-semibold mb-3 flex items-center gap-2">
          <Dices className="w-4 h-4 text-primary" /> Roll for Loot
        </h2>
        <div className="flex gap-3 items-center flex-wrap">
          <Input
            placeholder="e.g. 3d6+2, d20, 42 (blank = random)"
            value={rollInput}
            onChange={(e) => setRollInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoll()}
            className="w-64"
          />
          <Button onClick={handleRoll} className="gap-2">
            <Dices className="w-4 h-4" /> Roll
          </Button>
        </div>

        {rolledResult && (
          <div className={`mt-4 border rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3 ${TYPE_STYLES[getResultType(rolledResult.result)]}`}>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Roll: <span className="font-bold text-foreground">{rolledResult.roll}</span></p>
              <p className="font-heading text-lg font-semibold">{rolledResult.result.result_label}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{TYPE_BADGE[getResultType(rolledResult.result)]}</Badge>
              <Button size="sm" variant="secondary" onClick={() => { setSelectedResult(rolledResult.result); setShowAddModal(true); }}>
                + Add to Inventory
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search results..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_5rem] text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/50 bg-secondary/20">
          <span>Roll</span>
          <span>Result</span>
          <span className="text-center">Type</span>
        </div>
        <div className="divide-y divide-border/30 max-h-[60vh] overflow-y-auto">
          {filtered.map((entry) => {
            const type = getResultType(entry);
            return (
              <div
                key={entry.roll_min}
                className={`grid grid-cols-[3rem_1fr_5rem] items-center px-4 py-2.5 text-sm hover:bg-secondary/20 transition-colors ${rolledResult?.roll >= entry.roll_min && rolledResult?.roll <= entry.roll_max ? 'bg-primary/10' : ''}`}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {entry.roll_min === entry.roll_max ? entry.roll_min : `${entry.roll_min}+`}
                </span>
                <span className="text-foreground">{entry.result_label}</span>
                <div className="flex justify-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_STYLES[type]}`}>
                    {TYPE_BADGE[type]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && selectedResult && (
        <AddToInventoryModal
          result={selectedResult}
          onClose={() => { setShowAddModal(false); setSelectedResult(null); }}
        />
      )}
    </div>
  );
}