import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Skull, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BESTIARY, formatHp, getDiceCount } from '@/lib/bestiaryData';
import { toast } from 'sonner';

const TABS = ['Monsters', 'Players', 'Map Tokens'];

export default function AddParticipantModal({ activeGroup, groupCharacters, onAdd, onClose, userEmail, vttTokens = [] }) {
  const [tab, setTab] = useState('Monsters');
  const [search, setSearch] = useState('');
  const [monsterSortBy, setMonsterSortBy] = useState('name');

  const floorWave = activeGroup?.floor_wave_number || 1;
  const dieType = activeGroup?.die_type || 'd6';
  const hpAveraged = activeGroup?.hp_averaged || false;

  const { data: customMonsters = [] } = useQuery({
    queryKey: ['custom-monsters', userEmail],
    queryFn: () => base44.entities.CustomMonster.filter({ owner_email: userEmail }),
    enabled: !!userEmail,
  });

  const allMonsters = [
    ...BESTIARY,
    ...customMonsters.map((m) => ({ ...m, _isCustom: true })),
  ];

  const HP_TYPE_ORDER = { weak: 1, standard: 2, tough: 3, hulking: 4 };
  const filteredMonsters = allMonsters
    .filter((m) => !search.trim() || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (monsterSortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      if (monsterSortBy === 'hp_type') return (HP_TYPE_ORDER[a.hp_type] || 0) - (HP_TYPE_ORDER[b.hp_type] || 0);
      return a.name.localeCompare(b.name);
    });

  const filteredPlayers = groupCharacters.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTokens = vttTokens.filter((t) =>
    !search.trim() || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddMonster = (monster) => {
    const diceCount = getDiceCount(monster.hp_type || 'standard', floorWave);
    const dieFaces = parseInt(dieType.replace('d', '')) || 6;
    let maxHp;
    if (hpAveraged) {
      maxHp = diceCount * Math.ceil(dieFaces / 2);
    } else {
      let total = 0;
      for (let i = 0; i < diceCount; i++) total += Math.floor(Math.random() * dieFaces) + 1;
      maxHp = total;
    }

    onAdd({
      participant_type: 'monster',
      name: monster.name,
      monster_id: monster.id,
      is_custom_monster: !!monster._isCustom,
      monster_snapshot: {
        defense: monster.defense,
        speed: monster.speed,
        hp_type: monster.hp_type,
        vulnerabilities: monster.vulnerabilities || [],
        resistances: monster.resistances || [],
        immunities: monster.immunities || [],
        attributes: monster.attributes || [],
        actions: monster.actions || [],
      },
      max_hp: maxHp,
      current_hp: maxHp,
      initiative: null,
      conditions: [],
    });
    toast.success(`${monster.name} added!`);
  };

  const handleAddPlayer = (character) => {
    onAdd({
      participant_type: 'player',
      name: character.name,
      character_id: character.id,
      max_hp: character.base_health || 10,
      current_hp: character.current_hp ?? character.base_health ?? 10,
      initiative: null,
      conditions: character.conditions || [],
    });
    toast.success(`${character.name} added!`);
  };

  const TOKEN_TYPE_LABELS = { player: 'Player', enemy: 'Enemy', friendly: 'Friendly', neutral: 'Neutral', innocent: 'Innocent' };

  const handleAddAllMapTokens = () => {
    filteredTokens.forEach((token) => handleAddMapToken(token));
    toast.success(`${filteredTokens.length} tokens added!`);
  };

  const handleAddMapToken = (token) => {
    const isPlayer = token.type === 'player';
    // Try to match to a character for HP
    const linkedChar = groupCharacters.find((c) => c.id === token.character_id);
    onAdd({
      participant_type: isPlayer ? 'player' : 'monster',
      name: token.name,
      character_id: token.character_id || undefined,
      monster_id: token.monster_id || undefined,
      max_hp: token.max_hp || linkedChar?.base_health || 10,
      current_hp: token.current_hp ?? token.max_hp ?? linkedChar?.current_hp ?? 10,
      initiative: null,
      conditions: [],
    });
    toast.success(`${token.name} added!`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Combatant</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 mb-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all',
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {tab === 'Monsters' && (
            <Select value={monsterSortBy} onValueChange={setMonsterSortBy}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="hp_type">HP Type</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {tab === 'Monsters' && filteredMonsters.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-3 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Skull className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.hp_type} · {formatHp(m.hp_type, floorWave, dieType, hpAveraged)} HP · DEF {m.defense}
                  </span>
                </div>
                {m._isCustom && <Badge className="text-[10px] bg-accent/20 text-accent-foreground border-accent/30 shrink-0">Custom</Badge>}
              </div>
              <Button size="sm" className="shrink-0 h-7 px-3 text-xs" onClick={() => handleAddMonster(m)}>Add</Button>
            </div>
          ))}

          {tab === 'Players' && filteredPlayers.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-3 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">HP {c.current_hp ?? c.base_health ?? 10}/{c.base_health ?? 10}</span>
                </div>
              </div>
              <Button size="sm" className="shrink-0 h-7 px-3 text-xs" onClick={() => handleAddPlayer(c)}>Add</Button>
            </div>
          ))}

          {tab === 'Monsters' && filteredMonsters.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No monsters found.</p>
          )}
          {tab === 'Players' && filteredPlayers.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No characters in this group.</p>
          )}

          {tab === 'Map Tokens' && filteredTokens.length > 0 && (
            <Button variant="outline" size="sm" className="w-full mb-1" onClick={handleAddAllMapTokens}>
              Add All ({filteredTokens.length})
            </Button>
          )}

          {tab === 'Map Tokens' && filteredTokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-3 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" style={{ color: t.color || undefined }} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {TOKEN_TYPE_LABELS[t.type] || t.type} · HP {t.current_hp ?? t.max_hp ?? '—'}/{t.max_hp ?? '—'}
                  </span>
                </div>
              </div>
              <Button size="sm" className="shrink-0 h-7 px-3 text-xs" onClick={() => handleAddMapToken(t)}>Add</Button>
            </div>
          ))}
          {tab === 'Map Tokens' && filteredTokens.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No tokens on this map.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}