import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BESTIARY, getDiceCount, getDieFaces } from '@/lib/bestiaryData';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';

const TOKEN_TYPES = ['player', 'enemy', 'friendly', 'neutral', 'innocent'];
const TOKEN_SIZES = ['tiny', 'small', 'medium', 'large', 'huge'];
const TOKEN_COLORS = { player: '#4ade80', enemy: '#f87171', friendly: '#60a5fa', neutral: '#facc15', innocent: '#9333ea' };

// Simple spiral offsets for multi-spawn positioning
function getSpiralOffsets(count) {
  const offsets = [{ col: 0, row: 0 }];
  const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
  let col = 0, row = 0, step = 1, dir = 0;
  while (offsets.length < count) {
    for (let turn = 0; turn < 2 && offsets.length < count; turn++) {
      for (let i = 0; i < step && offsets.length < count; i++) {
        col += dirs[dir][0]; row += dirs[dir][1];
        offsets.push({ col, row });
      }
      dir = (dir + 1) % 4;
    }
    step++;
  }
  return offsets;
}

export default function AddTokenModal({ groupCharacters, isGM, user, onAdd, onClose, activeGroup, defaultX, defaultY, onBulkAdd }) {
  const [mode, setMode] = useState('character'); // 'character' | 'monster' | 'custom' | 'innocent'
  const [search, setSearch] = useState('');
  const [tokenType, setTokenType] = useState('player');
  const [tokenSize, setTokenSize] = useState('medium');
  const [customName, setCustomName] = useState('');
  const [selectedCharId, setSelectedCharId] = useState('');
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const myChars = groupCharacters?.filter((c) => isGM || c.created_by === user?.email) || [];
  const filteredMonsters = BESTIARY.filter((m) =>
    !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleAdd = async () => {
    const baseX = defaultX ?? 5;
    const baseY = defaultY ?? 4;

    if (mode === 'innocent') {
      setIsGenerating(true);
      try {
        const qty = Math.max(1, Math.min(20, quantity));
        let names = [];

        if (qty === 1 && customName.trim()) {
          names = [customName.trim()];
        } else {
          const res = await base44.functions.invoke('generateFantasyNames', { quantity: qty });
          names = res.data?.names || [];
          // Fallback if LLM returns fewer names
          while (names.length < qty) names.push(`Townsperson ${names.length + 1}`);
          names = names.slice(0, qty);
        }

        const offsets = getSpiralOffsets(qty);
        const tokens = names.map((name, i) => ({
          name,
          type: 'innocent',
          size: tokenSize,
          color: TOKEN_COLORS.innocent,
          max_hp: 4,
          current_hp: 4,
          x: baseX + offsets[i].col,
          y: baseY + offsets[i].row,
        }));

        if (onBulkAdd) {
          await onBulkAdd(tokens);
        } else {
          for (const t of tokens) await onAdd(t);
        }
      } finally {
        setIsGenerating(false);
        onClose();
      }
      return;
    }

    let token = { type: tokenType, size: tokenSize };

    if (mode === 'character') {
      const char = myChars.find((c) => c.id === selectedCharId);
      if (!char) return;
      token = {
        ...token,
        name: char.name,
        character_id: char.id,
        current_hp: char.current_hp ?? char.base_health ?? 10,
        max_hp: char.base_health ?? 10,
        color: TOKEN_COLORS.player,
        type: 'player',
      };
    } else if (mode === 'monster' && selectedMonster) {
      const floorWave = activeGroup?.floor_wave_number || 1;
      const dieType = activeGroup?.die_type || 'd6';
      const hpAveraged = activeGroup?.hp_averaged || false;
      const diceCount = getDiceCount(selectedMonster.hp_type || 'standard', floorWave);
      const dieFaces = getDieFaces(dieType);
      let maxHp;
      if (hpAveraged) {
        maxHp = diceCount * Math.floor(dieFaces / 2);
      } else {
        let total = 0;
        for (let i = 0; i < diceCount; i++) total += Math.floor(Math.random() * dieFaces) + 1;
        maxHp = total;
      }
      token = {
        ...token,
        name: selectedMonster.name,
        monster_id: selectedMonster.id,
        color: TOKEN_COLORS.enemy,
        type: 'enemy',
        max_hp: maxHp,
        current_hp: maxHp,
      };
    } else if (mode === 'custom') {
      if (!customName.trim()) return;
      token = { ...token, name: customName.trim(), color: TOKEN_COLORS[tokenType] };
      if (tokenType === 'innocent') {
        token.max_hp = 4;
        token.current_hp = 4;
      }
    } else return;

    token.x = baseX;
    token.y = baseY;
    onAdd(token);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 w-full max-w-md mx-4 flex flex-col gap-3 max-h-[85%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">Add Token</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 mb-2">
          {['character', ...(isGM ? ['monster', 'custom', 'innocent'] : [])].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'character' && (
          <div className="space-y-3">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={selectedCharId}
              onChange={(e) => setSelectedCharId(e.target.value)}
            >
              <option value="">— Select character —</option>
              {myChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Size</label>
              <div className="flex gap-1 flex-wrap">
                {TOKEN_SIZES.map((s) => (
                  <button key={s} onClick={() => setTokenSize(s)}
                    className={`px-2 py-1 rounded text-xs capitalize ${tokenSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'monster' && isGM && (
          <div className="space-y-3">
            <Input placeholder="Search bestiary..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredMonsters.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMonster(m)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedMonster?.id === m.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary/40 text-foreground'}`}
                >
                  {m.name} <span className="text-xs text-muted-foreground">({m.category})</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Size</label>
              <div className="flex gap-1 flex-wrap">
                {TOKEN_SIZES.map((s) => (
                  <button key={s} onClick={() => setTokenSize(s)}
                    className={`px-2 py-1 rounded text-xs capitalize ${tokenSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'custom' && isGM && (
          <div className="space-y-3">
            <Input placeholder="Token name..." value={customName} onChange={(e) => setCustomName(e.target.value)} autoFocus />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <div className="flex gap-1 flex-wrap">
                {TOKEN_TYPES.filter((t) => t !== 'innocent').map((t) => (
                  <button key={t} onClick={() => setTokenType(t)}
                    className={`px-2 py-1 rounded text-xs capitalize ${tokenType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Size</label>
              <div className="flex gap-1 flex-wrap">
                {TOKEN_SIZES.map((s) => (
                  <button key={s} onClick={() => setTokenSize(s)}
                    className={`px-2 py-1 rounded text-xs capitalize ${tokenSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'innocent' && isGM && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Quantity</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground mt-1">Names will be auto-generated. For 1, you can set a custom name below.</p>
            </div>
            {quantity === 1 && (
              <Input
                placeholder="Custom name (optional)..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Size</label>
              <div className="flex gap-1 flex-wrap">
                {TOKEN_SIZES.map((s) => (
                  <button key={s} onClick={() => setTokenSize(s)}
                    className={`px-2 py-1 rounded text-xs capitalize ${tokenSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
              Innocents spawn with 4 HP. They share a single initiative slot in encounters.
            </div>
          </div>
        )}

        {/* Color legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
          {Object.entries(TOKEN_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isGenerating}>
            {isGenerating ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
            ) : (
              mode === 'innocent' && quantity > 1 ? `Spawn ${quantity} Innocents` : 'Add Token'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}