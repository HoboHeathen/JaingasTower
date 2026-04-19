import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Heart, Zap, Search, Plus, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BESTIARY, CATEGORIES, formatHp, formatDamage, getDiceCount, getDamageDiceCount } from '@/lib/bestiaryData';

const DAMAGE_COLORS = {
  light: 'text-yellow-400',
  medium: 'text-orange-400',
  heavy: 'text-red-400',
  devastating: 'text-purple-400',
};

const HP_TIER_COLORS = {
  weak: 'bg-green-500/10 text-green-400 border-green-500/30',
  standard: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  tough: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  hulking: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function BestiaryTab({ activeGroup, isGM }) {
  const [floorWave, setFloorWave] = useState(activeGroup?.floor_wave_number || 1);
  const [dieType, setDieType] = useState(activeGroup?.die_type || 'd6');
  const [hpAveraged, setHpAveraged] = useState(activeGroup?.hp_averaged || false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const queryClient = useQueryClient();

  const updateGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.Group.update(activeGroup.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', activeGroup.id] });
      toast.success('Settings saved!');
    },
  });

  const addToGroupMutation = useMutation({
    mutationFn: (monster) => base44.entities.GroupBestiary.create({
      group_id: activeGroup.id,
      monster_name: monster.name,
      description: `${monster.size} | DEF: ${monster.defense} | SPD: ${monster.speed} | HP: ${formatHp(monster.hp_type, floorWave, dieType, hpAveraged)}`,
      hp: getDiceCount(monster.hp_type, floorWave),
      armor: monster.defense,
      speed: parseInt(monster.speed) || 0,
      special_abilities: [
        ...monster.attributes.map((a) => `${a.name}: ${a.description}`),
        ...monster.actions.map((a) => `[${a.action_slot}] ${a.name} (${a.to_hit !== '—' ? a.to_hit : 'auto'}, ${a.range}): ${a.damage_type ? formatDamage(a.damage_type, floorWave, dieType) + ' dmg' : ''} ${a.effect || ''}`),
      ].join('\n'),
      is_visible_to_players: false,
    }),
    onSuccess: () => toast.success('Monster added to group bestiary!'),
    onError: () => toast.error('Failed to add monster'),
  });

  const handleSaveSettings = () => {
    updateGroupMutation.mutate({
      floor_wave_number: floorWave,
      die_type: dieType,
      hp_averaged: hpAveraged,
    });
  };

  const filtered = BESTIARY.filter((m) => {
    const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchSearch = !search.trim() || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* GM Settings Bar */}
      {isGM && (
        <div className="bg-card border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">Encounter Settings</span>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">GM Only</Badge>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Floor / Wave #</label>
              <Input
                type="number"
                min={1}
                value={floorWave}
                onChange={(e) => setFloorWave(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Die Type</label>
              <select
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground"
                value={dieType}
                onChange={(e) => setDieType(e.target.value)}
              >
                {['d4', 'd6', 'd8', 'd10', 'd12'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <input
                type="checkbox"
                id="hp-avg"
                checked={hpAveraged}
                onChange={(e) => setHpAveraged(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="hp-avg" className="text-sm text-muted-foreground cursor-pointer">Averaged HP</label>
            </div>
            <Button size="sm" onClick={handleSaveSettings} disabled={updateGroupMutation.isPending}>
              Save for Group
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Current: <span className="text-primary">Wave {floorWave}</span> — Weak: {Math.ceil(floorWave/2)}{dieType}, Standard: {floorWave}{dieType}, Tough: {floorWave*2}{dieType}, Hulking: {floorWave*3}{dieType}
          </p>
        </div>
      )}

      {/* Players see read-only settings */}
      {!isGM && (
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Wave/Floor:</span>
            <span className="text-sm font-semibold text-foreground">{activeGroup?.floor_wave_number || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Die Type:</span>
            <span className="text-sm font-semibold text-primary">{activeGroup?.die_type || 'd6'}</span>
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search monsters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Monster List */}
      <div className="space-y-2">
        {filtered.map((monster) => {
          const isOpen = expandedId === monster.id;
          const displayFloor = isGM ? floorWave : (activeGroup?.floor_wave_number || 1);
          const displayDie = isGM ? dieType : (activeGroup?.die_type || 'd6');
          const displayAvg = isGM ? hpAveraged : (activeGroup?.hp_averaged || false);

          return (
            <div key={monster.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
                onClick={() => setExpandedId(isOpen ? null : monster.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-foreground text-sm">{monster.name}</span>
                    <span className="text-xs text-muted-foreground">{monster.size}</span>
                    <Badge variant="outline" className={cn('text-[10px] border', HP_TIER_COLORS[monster.hp_type])}>
                      {monster.hp_type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                      {monster.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1 text-red-400">
                      <Heart className="w-3 h-3" />
                      {formatHp(monster.hp_type, displayFloor, displayDie, displayAvg)}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Shield className="w-3 h-3" />
                      {monster.defense}
                    </span>
                    <span className="text-muted-foreground">{monster.speed}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isGM && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1"
                      onClick={(e) => { e.stopPropagation(); addToGroupMutation.mutate(monster); }}
                      disabled={addToGroupMutation.isPending}
                    >
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {monster.vulnerabilities.map((v) => (
                      <Badge key={v} className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">Vuln: {v}</Badge>
                    ))}
                    {monster.resistances.map((r) => (
                      <Badge key={r} className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">Resist: {r}</Badge>
                    ))}
                    {monster.immunities.map((i) => (
                      <Badge key={i} className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">Immune: {i}</Badge>
                    ))}
                  </div>

                  {/* Attributes */}
                  {monster.attributes.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Attributes</p>
                      <div className="space-y-1.5">
                        {monster.attributes.map((attr) => (
                          <div key={attr.name} className="text-xs text-foreground/80">
                            <span className="font-semibold text-foreground">{attr.name}.</span> {attr.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Actions</p>
                    <div className="space-y-1.5">
                      {monster.actions.map((action, i) => (
                        <div key={i} className="text-xs text-foreground/80 flex flex-wrap gap-1.5 items-baseline">
                          <span className="font-semibold text-foreground">{action.name}.</span>
                          <span className="text-muted-foreground">{action.action_slot} Action.</span>
                          {action.range !== '—' && <span>{action.range}.</span>}
                          {action.to_hit !== '—' && <span>{action.to_hit} to hit.</span>}
                          {action.damage_type && (
                            <span className={cn('font-semibold', DAMAGE_COLORS[action.damage_type])}>
                              {formatDamage(action.damage_type, displayFloor, displayDie)} ({action.damage_type})
                              {action.damage_keyword ? ` ${action.damage_keyword}` : ''} dmg.
                            </span>
                          )}
                          {action.effect && <span className="text-muted-foreground">{action.effect}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No monsters match your search.</div>
        )}
      </div>
    </div>
  );
}