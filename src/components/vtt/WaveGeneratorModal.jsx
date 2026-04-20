import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BESTIARY, CATEGORIES, getDiceCount, getDieFaces } from '@/lib/bestiaryData';
import { base44 } from '@/api/base44Client';

const TOKEN_COLOR = '#f87171';

// Auto-select monsters for a wave based on wave number scaling
function buildDefaultWave(waveNumber) {
  // Pick monsters that make sense for this wave tier
  // Early waves (1-3): weak/standard low-tier monsters
  // Mid waves (4-7): standard/tough monsters, more variety
  // Late waves (8+): tough/hulking monsters
  const tier = waveNumber <= 3 ? 'low' : waveNumber <= 7 ? 'mid' : 'high';

  const hpPriority = {
    low: ['weak', 'standard'],
    mid: ['standard', 'tough'],
    high: ['tough', 'hulking'],
  }[tier];

  // Pick 2-4 monster types that match the tier, spread across categories
  const eligible = BESTIARY.filter((m) => hpPriority.includes(m.hp_type));
  const byCategory = {};
  eligible.forEach((m) => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  });

  const selected = [];
  const categories = Object.keys(byCategory);
  // Pick 1 monster from up to 2 different categories, cycling by wave number
  const catCount = Math.min(2, categories.length);
  for (let i = 0; i < catCount; i++) {
    const cat = categories[(waveNumber - 1 + i) % categories.length];
    const monsters = byCategory[cat];
    if (monsters?.length) {
      selected.push(monsters[(waveNumber - 1) % monsters.length]);
    }
  }

  // Count: scales with wave — 2 + floor(waveNumber / 2), capped at 8
  const baseCount = Math.min(8, 2 + Math.floor(waveNumber / 2));
  const countPer = Math.max(1, Math.floor(baseCount / selected.length));

  return selected.map((m) => ({ monster: m, count: countPer }));
}

function rollHp(monster, waveNumber, dieType, hpAveraged) {
  const diceCount = getDiceCount(monster.hp_type || 'standard', waveNumber);
  const dieFaces = getDieFaces(dieType);
  if (hpAveraged) {
    return diceCount * Math.floor(dieFaces / 2);
  }
  let total = 0;
  for (let d = 0; d < diceCount; d++) total += Math.floor(Math.random() * dieFaces) + 1;
  return total;
}

function spreadAroundSpawnPoints(spawnCells, count) {
  if (!spawnCells.length) {
    return Array.from({ length: count }, (_, i) => ({ x: 5 + (i % 5), y: 4 + Math.floor(i / 5) }));
  }
  const positions = [];
  for (let i = 0; i < count; i++) {
    const base = spawnCells[i % spawnCells.length];
    const offset = Math.floor(i / spawnCells.length);
    positions.push({ x: base.col + (offset % 3), y: base.row + Math.floor(offset / 3) });
  }
  return positions;
}

export default function WaveGeneratorModal({ walls, activeGroup, onSpawnTokens, onClose }) {
  const waveNumber = activeGroup?.floor_wave_number || 1;
  const dieType = activeGroup?.die_type || 'd6';
  const hpAveraged = activeGroup?.hp_averaged || false;

  // Wave entries: [{monster, count}]
  const defaultEntries = useMemo(() => buildDefaultWave(waveNumber), [waveNumber]);
  const [entries, setEntries] = useState(defaultEntries);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const spawnCells = (walls || [])
    .filter((w) => w.type === 'spawn_point')
    .flatMap((w) => w.cells || []);

  const totalCount = entries.reduce((sum, e) => sum + (e.count || 1), 0);

  const addMonster = (monster) => {
    if (entries.find((e) => e.monster.id === monster.id)) return;
    setEntries((prev) => [...prev, { monster, count: 1 }]);
    setShowSearch(false);
    setSearch('');
  };

  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.monster.id !== id));

  const updateCount = (id, val) =>
    setEntries((prev) =>
      prev.map((e) => e.monster.id === id ? { ...e, count: Math.max(1, parseInt(val) || 1) } : e)
    );

  const filteredMonsters = BESTIARY.filter(
    (m) =>
      !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleSpawn = async () => {
    const allTokens = [];
    entries.forEach(({ monster, count }) => {
      for (let i = 0; i < count; i++) {
        const maxHp = rollHp(monster, waveNumber, dieType, hpAveraged);
        allTokens.push({
          id: crypto.randomUUID(),
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          type: 'enemy',
          size: 'medium',
          monster_id: monster.id,
          color: TOKEN_COLOR,
          max_hp: maxHp,
          current_hp: maxHp,
        });
      }
    });

    const positions = spreadAroundSpawnPoints(spawnCells, allTokens.length);
    allTokens.forEach((t, i) => {
      t.x = positions[i]?.x ?? 5;
      t.y = positions[i]?.y ?? 4;
    });

    // Increment the wave number on the group
    if (activeGroup?.id) {
      await base44.entities.Group.update(activeGroup.id, {
        floor_wave_number: waveNumber + 1,
      });
    }

    onSpawnTokens(allTokens);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 flex flex-col gap-3"
        style={{ maxHeight: '85%', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">Wave {waveNumber}</h2>
          <span className="text-xs text-muted-foreground">
            {spawnCells.length > 0 ? `${spawnCells.length} spawn point(s)` : 'No spawn points'}
          </span>
        </div>

        <p className="text-xs text-muted-foreground -mt-1">
          Auto-populated for wave {waveNumber}. Adjust below, then spawn.
        </p>

        {/* Monster entries */}
        <div className="space-y-2">
          {entries.map(({ monster, count }) => {
            const diceCount = getDiceCount(monster.hp_type || 'standard', waveNumber);
            const hpLabel = hpAveraged
              ? `~${diceCount * Math.floor(getDieFaces(dieType) / 2)} HP`
              : `${diceCount}${dieType} HP`;
            return (
              <div key={monster.id} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{monster.name}</p>
                  <p className="text-[10px] text-muted-foreground">{monster.category} · {hpLabel} each</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => updateCount(monster.id, e.target.value)}
                  className="w-14 h-7 rounded border border-input bg-background px-2 text-xs text-center text-foreground"
                />
                <button
                  onClick={() => removeEntry(monster.id)}
                  className="text-muted-foreground hover:text-destructive text-lg leading-none px-1"
                  title="Remove"
                >×</button>
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-2">No monsters added yet.</p>
          )}
        </div>

        {/* Add monster search */}
        {showSearch ? (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Search monsters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: '160px' }}>
              {filteredMonsters.map((m) => (
                <div
                  key={m.id}
                  onClick={() => addMonster(m)}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-secondary/40 text-foreground"
                >
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.category}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSearch(false)} className="text-xs text-muted-foreground hover:text-foreground self-end">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="text-xs text-primary hover:underline self-start"
          >
            + Add monster
          </button>
        )}

        {/* Summary */}
        <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
          Spawning <span className="text-primary font-semibold">{totalCount}</span> token{totalCount !== 1 ? 's' : ''}
          {activeGroup?.id && <> · Next wave will be <span className="text-primary font-semibold">{waveNumber + 1}</span></>}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSpawn} disabled={totalCount === 0}>Spawn Wave {waveNumber}</Button>
        </div>
      </div>
    </div>
  );
}