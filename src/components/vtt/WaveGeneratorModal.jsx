import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BESTIARY, getDiceCount, getDieFaces } from '@/lib/bestiaryData';

const TOKEN_COLORS = { player: '#4ade80', enemy: '#f87171', friendly: '#60a5fa', neutral: '#facc15', innocent: '#9333ea' };

// Spread tokens around spawn points
function spreadAroundSpawnPoints(spawnCells, count) {
  if (!spawnCells.length) {
    // No spawn points: place in a grid near 5,5
    return Array.from({ length: count }, (_, i) => ({ x: 5 + (i % 5), y: 4 + Math.floor(i / 5) }));
  }
  const positions = [];
  for (let i = 0; i < count; i++) {
    const base = spawnCells[i % spawnCells.length];
    const offset = Math.floor(i / spawnCells.length);
    const dx = offset % 3;
    const dy = Math.floor(offset / 3);
    positions.push({ x: base.col + dx, y: base.row + dy });
  }
  return positions;
}

export default function WaveGeneratorModal({ walls, activeGroup, onSpawnTokens, onClose }) {
  const [selectedMonsters, setSelectedMonsters] = useState([]);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});

  const filteredMonsters = BESTIARY.filter((m) =>
    !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 40);

  const spawnCells = (walls || [])
    .filter((w) => w.type === 'spawn_point')
    .flatMap((w) => w.cells || []);

  const toggleMonster = (monster) => {
    setSelectedMonsters((prev) =>
      prev.find((m) => m.id === monster.id)
        ? prev.filter((m) => m.id !== monster.id)
        : [...prev, monster]
    );
    if (!counts[monster.id]) setCounts((c) => ({ ...c, [monster.id]: 1 }));
  };

  const totalCount = selectedMonsters.reduce((sum, m) => sum + (counts[m.id] || 1), 0);

  const handleSpawn = () => {
    const floorWave = activeGroup?.floor_wave_number || 1;
    const dieType = activeGroup?.die_type || 'd6';
    const hpAveraged = activeGroup?.hp_averaged || false;
    const dieFaces = getDieFaces(dieType);

    const allTokens = [];
    selectedMonsters.forEach((monster) => {
      const count = counts[monster.id] || 1;
      const diceCount = getDiceCount(monster.hp_type || 'standard', floorWave);
      for (let i = 0; i < count; i++) {
        let maxHp;
        if (hpAveraged) {
          maxHp = diceCount * Math.floor(dieFaces / 2);
        } else {
          let total = 0;
          for (let d = 0; d < diceCount; d++) total += Math.floor(Math.random() * dieFaces) + 1;
          maxHp = total;
        }
        allTokens.push({
          id: crypto.randomUUID(),
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          type: 'enemy',
          size: 'medium',
          monster_id: monster.id,
          color: TOKEN_COLORS.enemy,
          max_hp: maxHp,
          current_hp: maxHp,
        });
      }
    });

    // Assign positions around spawn points
    const positions = spreadAroundSpawnPoints(spawnCells, allTokens.length);
    allTokens.forEach((t, i) => {
      t.x = positions[i]?.x ?? 5;
      t.y = positions[i]?.y ?? 4;
    });

    onSpawnTokens(allTokens);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Wave Generator</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          {spawnCells.length > 0
            ? `Spawning at ${spawnCells.length} spawn point(s).`
            : 'No spawn points placed — tokens will appear near the center.'}
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search monsters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        {/* Monster list */}
        <div className="max-h-52 overflow-y-auto space-y-1">
          {filteredMonsters.map((m) => {
            const selected = !!selectedMonsters.find((s) => s.id === m.id);
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${selected ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/40 text-foreground'}`}
                onClick={() => toggleMonster(m)}
              >
                <span>{m.name} <span className="text-xs text-muted-foreground">({m.category})</span></span>
                {selected && (
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={counts[m.id] || 1}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCounts((c) => ({ ...c, [m.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-14 h-7 rounded border border-input bg-background px-2 text-xs text-center"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {totalCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Spawning <span className="text-primary font-semibold">{totalCount}</span> token{totalCount !== 1 ? 's' : ''}: {selectedMonsters.map((m) => `${counts[m.id] || 1}× ${m.name}`).join(', ')}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSpawn} disabled={totalCount === 0}>Spawn Wave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}