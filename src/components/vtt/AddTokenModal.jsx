import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BESTIARY } from '@/lib/bestiaryData';

const TOKEN_TYPES = ['player', 'enemy', 'friendly', 'neutral'];
const TOKEN_SIZES = ['tiny', 'small', 'medium', 'large', 'huge'];
const TOKEN_COLORS = { player: '#4ade80', enemy: '#f87171', friendly: '#60a5fa', neutral: '#facc15' };

export default function AddTokenModal({ groupCharacters, isGM, user, onAdd, onClose }) {
  const [mode, setMode] = useState('character'); // 'character' | 'monster' | 'custom'
  const [search, setSearch] = useState('');
  const [tokenType, setTokenType] = useState('player');
  const [tokenSize, setTokenSize] = useState('medium');
  const [customName, setCustomName] = useState('');
  const [selectedCharId, setSelectedCharId] = useState('');
  const [selectedMonster, setSelectedMonster] = useState(null);

  const myChars = groupCharacters?.filter((c) => isGM || c.created_by === user?.email) || [];
  const filteredMonsters = BESTIARY.filter((m) =>
    !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleAdd = () => {
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
      token = {
        ...token,
        name: selectedMonster.name,
        monster_id: selectedMonster.id,
        color: TOKEN_COLORS.enemy,
        type: 'enemy',
      };
    } else if (mode === 'custom') {
      if (!customName.trim()) return;
      token = { ...token, name: customName.trim(), color: TOKEN_COLORS[tokenType] };
    } else return;

    onAdd(token);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Token</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 mb-2">
          {['character', ...(isGM ? ['monster', 'custom'] : [])].map((m) => (
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
                {TOKEN_TYPES.map((t) => (
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd}>Add Token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}