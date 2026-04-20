import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BESTIARY, getDiceCount, getDieFaces, getAverageHpD6 } from '@/lib/bestiaryData';
import { base44 } from '@/api/base44Client';

const TOKEN_COLOR = '#f87171';
const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12'];

// Auto-populate monsters to fill a budget of 25 * waveNumber average HP (using d6 baseline)
function buildDefaultWave(waveNumber) {
  const budget = 25 * waveNumber;
  let remaining = budget;
  const counts = {}; // monster.id -> count

  // Sort monsters by their d6 avg HP ascending so we can fill precisely
  const monstersWithAvg = BESTIARY.map((m) => ({
    monster: m,
    avgHp: getAverageHpD6(m, waveNumber),
  })).filter((m) => m.avgHp > 0).sort((a, b) => a.avgHp - b.avgHp);

  if (!monstersWithAvg.length) return [];

  // Greedily fill budget, picking a random eligible monster each time
  let attempts = 0;
  while (remaining > 0 && attempts < 200) {
    // Pick monsters that fit within remaining budget (or smallest if none fit)
    const eligible = monstersWithAvg.filter((m) => m.avgHp <= remaining);
    const pool = eligible.length ? eligible : [monstersWithAvg[0]];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    counts[pick.monster.id] = (counts[pick.monster.id] || 0) + 1;
    remaining -= pick.avgHp;
    attempts++;
  }

  return Object.entries(counts).map(([id, count]) => ({
    monster: BESTIARY.find((m) => m.id === id),
    count,
  }));
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
  const shuffled = [...spawnCells].sort(() => Math.random() - 0.5);
  const positions = [];
  for (let i = 0; i < count; i++) {
    const base = shuffled[i % shuffled.length];
    const offset = Math.floor(i / shuffled.length);
    positions.push({ x: base.col + (offset % 3), y: base.row + Math.floor(offset / 3) });
  }
  return positions;
}

export default function WaveGeneratorModal({ walls, activeGroup, onSpawnTokens, onClose }) {
  const waveNumber = activeGroup?.floor_wave_number || 1;
  const hpAveraged = activeGroup?.hp_averaged || false;

  const [currentDieType, setCurrentDieType] = useState(activeGroup?.die_type || 'd6');

  const defaultEntries = useMemo(() => buildDefaultWave(waveNumber), [waveNumber]);
  const [entries, setEntries] = useState(defaultEntries);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const spawnCells = (walls || [])
    .filter((w) => w.type === 'spawn_point')
    .flatMap((w) => w.cells || []);

  const totalCount = entries.reduce((sum, e) => sum + (e.count || 1), 0);
  const totalBudgetUsed = entries.reduce((sum, e) => sum + getAverageHpD6(e.monster, waveNumber) * (e.count || 1), 0);
  const waveBudget = 25 * waveNumber;

  const handleDieTypeChange = async (newDieType) => {
    setCurrentDieType(newDieType);
    if (activeGroup?.id) {
      await base44.entities.Group.update(activeGroup.id, { die_type: newDieType });
    }
  };

  const addMonster = (monster) => {
    if (entries.find((e) => e.monster.id === monster.id)) return;
    setEntries((prev) => [...prev, { monster, count: 1 }]);
    setShowSearch(false);
    setSearch('');
  };

  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.monster.id !== id));

  const updateCount = (id, val) =>
    setEntries((prev) =>
      prev.map((e) => (e.monster.id === id ? { ...e, count: Math.max(1, parseInt(val) || 1) } : e))
    );

  const filteredMonsters = BESTIARY.filter(
    (m) => !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleSpawn = async () => {
    const allTokens = [];
    entries.forEach(({ monster, count }) => {
      for (let i = 0; i < count; i++) {
        const maxHp = rollHp(monster, waveNumber, currentDieType, hpAveraged);
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

        {/* Die type selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Die Type:</span>
          <div className="flex gap-1">
            {DIE_TYPES.map((d) => (
              <button
                key={d}
                onClick={() => handleDieTypeChange(d)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all ${
                  currentDieType === d
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/70'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground -mt-1">
          Budget: <span className="text-primary font-semibold">{waveBudget}</span> avg HP (d6 base) · 
          Used: <span className={totalBudgetUsed > waveBudget ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>{totalBudgetUsed}</span>
        </p>

        {/* Monster entries */}
        <div className="space-y-2">
          {entries.map(({ monster, count }) => {
            const diceCount = getDiceCount(monster.hp_type || 'standard', waveNumber);
            const dieFaces = getDieFaces(currentDieType);
            const avgHp = diceCount * Math.floor(dieFaces / 2);
            const avgHpD6 = getAverageHpD6(monster, waveNumber);
            const hpFormula = `${diceCount}${currentDieType}`;
            const hpLabel = hpAveraged
              ? `${hpFormula} = ~${avgHp} HP (avg)`
              : `${hpFormula} (avg ~${avgHp})`;
            return (
              <div key={monster.id} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{monster.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {monster.category} · <span className="text-primary/80 font-mono">{hpLabel}</span> each
                    <span className="text-muted-foreground/60"> · d6 budget: {avgHpD6}/ea</span>
                  </p>
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
                  <span className="text-xs text-muted-foreground">{m.category} · d6 avg: {getAverageHpD6(m, waveNumber)}</span>
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
          Spawning <span className="text-primary font-semibold">{totalCount}</span> token{totalCount !== 1 ? 's' : ''} · HP rolls use <span className="text-primary font-semibold">{currentDieType}</span>
          {activeGroup?.id && <> · Next wave: <span className="text-primary font-semibold">{waveNumber + 1}</span></>}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSpawn} disabled={totalCount === 0}>Spawn Wave {waveNumber}</Button>
        </div>
      </div>
    </div>
  );
}