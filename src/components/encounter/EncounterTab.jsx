import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Swords, Heart, Shield, ChevronUp, ChevronDown,
  Dices, Trash2, Play, StopCircle, RotateCcw, User, Skull
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BESTIARY, formatHp, formatDamage, getDiceCount } from '@/lib/bestiaryData';
import AddParticipantModal from '@/components/encounter/AddParticipantModal';

function rollD20() { return Math.floor(Math.random() * 20) + 1; }

const CONDITIONS = ['Blinded', 'Charmed', 'Dazed', 'Frightened', 'Grappled', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned'];

export default function EncounterTab({ activeGroup, isGM, user, groupCharacters }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [hpInputs, setHpInputs] = useState({});

  const floorWave = activeGroup?.floor_wave_number || 1;
  const dieType = activeGroup?.die_type || 'd6';
  const hpAveraged = activeGroup?.hp_averaged || false;

  const { data: encounters = [] } = useQuery({
    queryKey: ['encounters', activeGroup?.id],
    queryFn: () => base44.entities.Encounter.filter({ group_id: activeGroup.id }),
    enabled: !!activeGroup?.id,
    refetchInterval: 5000,
  });

  const activeEncounter = encounters.find((e) => e.is_active) || null;

  const { data: participants = [] } = useQuery({
    queryKey: ['encounter-participants', activeEncounter?.id],
    queryFn: () => base44.entities.EncounterParticipant.filter({ encounter_id: activeEncounter.id }),
    enabled: !!activeEncounter?.id,
    refetchInterval: 3000,
  });

  const sortedParticipants = [...participants].sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  const startEncounterMutation = useMutation({
    mutationFn: () => base44.entities.Encounter.create({ group_id: activeGroup.id, is_active: true, round: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast.success('Encounter started!');
    },
  });

  const endEncounterMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Encounter.update(activeEncounter.id, { is_active: false });
      for (const p of participants) {
        await base44.entities.EncounterParticipant.delete(p.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      queryClient.invalidateQueries({ queryKey: ['encounter-participants'] });
      toast.success('Encounter ended.');
    },
  });

  const nextRoundMutation = useMutation({
    mutationFn: () => base44.entities.Encounter.update(activeEncounter.id, { round: (activeEncounter.round || 1) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encounters'] }),
  });

  const updateParticipantMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EncounterParticipant.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encounter-participants'] }),
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: (id) => base44.entities.EncounterParticipant.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encounter-participants'] }),
  });

  const addParticipantMutation = useMutation({
    mutationFn: (data) => base44.entities.EncounterParticipant.create({ ...data, encounter_id: activeEncounter.id, group_id: activeGroup.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-participants'] });
      toast.success('Added to encounter!');
    },
  });

  const handleRollAllInitiative = () => {
    participants.forEach((p) => {
      let initiative;
      if (p.participant_type === 'player') {
        const char = groupCharacters.find((c) => c.id === p.character_id);
        const dexMod = char ? Math.floor(((char.dex || 8) - 10) / 2) : 0;
        initiative = rollD20() + dexMod;
      } else {
        // Monsters get +1 per floor/wave
        initiative = rollD20() + floorWave;
      }
      updateParticipantMutation.mutate({ id: p.id, data: { initiative } });
    });
    toast.success('Initiative rolled for all!');
  };

  const handleApplyHpChange = (participant, delta) => {
    const newHp = Math.max(0, (participant.current_hp ?? participant.max_hp ?? 0) + delta);
    updateParticipantMutation.mutate({ id: participant.id, data: { current_hp: newHp } });
    setHpInputs((prev) => ({ ...prev, [participant.id]: '' }));
  };

  const handleToggleCondition = (participant, condition) => {
    const current = participant.conditions || [];
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    updateParticipantMutation.mutate({ id: participant.id, data: { conditions: updated } });
  };

  const handleRollMonsterAttack = (participant, action) => {
    const snap = participant.monster_snapshot || {};
    const toHit = parseInt((action.to_hit || '+0').replace('+', '')) || 0;
    const hitRoll = rollD20() + toHit;
    const damageRoll = action.damage_type
      ? `${formatDamage(action.damage_type, floorWave, dieType)} (${action.damage_type})`
      : '—';
    toast(`${participant.name} — ${action.name}: Hit ${hitRoll} | Damage: ${damageRoll}`, { duration: 6000 });
  };

  if (!activeEncounter) {
    return (
      <div className="text-center py-16 space-y-4">
        <Swords className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">No active encounter.</p>
        <Button onClick={() => startEncounterMutation.mutate()} disabled={startEncounterMutation.isPending} className="gap-2">
          <Play className="w-4 h-4" /> Start Encounter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encounter Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1">
            <Swords className="w-3 h-3" /> Round {activeEncounter.round || 1}
          </Badge>
          <span className="text-xs text-muted-foreground">Wave {floorWave} · {dieType}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isGM && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleRollAllInitiative}>
              <Dices className="w-3.5 h-3.5" /> Roll Initiative
            </Button>
          )}
          {isGM && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => nextRoundMutation.mutate()}>
              <RotateCcw className="w-3.5 h-3.5" /> Next Round
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Combatant
          </Button>
          {isGM && (
            <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => endEncounterMutation.mutate()}>
              <StopCircle className="w-3.5 h-3.5" /> End Encounter
            </Button>
          )}
        </div>
      </div>

      {/* Participants */}
      {sortedParticipants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No combatants yet. Add monsters and players above.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedParticipants.map((p) => {
            const isOpen = expandedId === p.id;
            const maxHp = p.max_hp ?? 0;
            const currentHp = p.current_hp ?? maxHp;
            const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 100;
            const isMonster = p.participant_type === 'monster';
            const snap = p.monster_snapshot || {};

            return (
              <div key={p.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : p.id)}
                >
                  {/* Initiative badge */}
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    p.initiative != null ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
                  )}>
                    {p.initiative != null ? p.initiative : '—'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isMonster ? <Skull className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <User className="w-3.5 h-3.5 text-primary shrink-0" />}
                      <span className="font-heading font-semibold text-sm text-foreground">{p.name}</span>
                      {(p.conditions || []).map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] text-destructive border-destructive/30">{c}</Badge>
                      ))}
                    </div>
                    {/* HP Bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <Heart className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-xs text-red-400 font-semibold w-16 shrink-0">{currentHp}/{maxHp}</span>
                      <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500')}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                      {snap.defense && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 shrink-0">
                          <Shield className="w-3 h-3" />{snap.defense}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isGM && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteParticipantMutation.mutate(p.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {/* GM Controls */}
                    {isGM && (
                      <div className="space-y-2">
                        {/* Initiative override */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground w-20">Initiative</label>
                          <Input
                            type="number"
                            className="w-20 h-7 text-xs"
                            defaultValue={p.initiative ?? ''}
                            onBlur={(e) => updateParticipantMutation.mutate({ id: p.id, data: { initiative: parseInt(e.target.value) || 0 } })}
                          />
                        </div>

                        {/* HP adjust */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground w-20">HP Change</label>
                          <Input
                            type="number"
                            className="w-20 h-7 text-xs"
                            placeholder="±"
                            value={hpInputs[p.id] || ''}
                            onChange={(e) => setHpInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-400 border-green-500/30"
                            onClick={() => handleApplyHpChange(p, parseInt(hpInputs[p.id] || 0))}>
                            Heal
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-400 border-red-500/30"
                            onClick={() => handleApplyHpChange(p, -(parseInt(hpInputs[p.id] || 0)))}>
                            Damage
                          </Button>
                        </div>

                        {/* Conditions */}
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5">Conditions</label>
                          <div className="flex flex-wrap gap-1">
                            {CONDITIONS.map((c) => (
                              <button
                                key={c}
                                onClick={() => handleToggleCondition(p, c)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-medium transition-all border',
                                  (p.conditions || []).includes(c)
                                    ? 'bg-destructive/20 text-destructive border-destructive/40'
                                    : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'
                                )}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Monster Actions */}
                    {isMonster && (snap.actions || []).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Actions</p>
                        <div className="space-y-1.5">
                          {snap.actions.map((action, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 bg-secondary/20 rounded-lg px-3 py-2">
                              <div className="text-xs">
                                <span className="font-semibold text-foreground">{action.name}</span>
                                <span className="text-muted-foreground ml-1.5">{action.action_slot}</span>
                                {action.to_hit && action.to_hit !== '—' && <span className="ml-1.5">{action.to_hit} to hit</span>}
                                {action.damage_type && (
                                  <span className="ml-1.5 text-orange-400">
                                    {formatDamage(action.damage_type, floorWave, dieType)} ({action.damage_type})
                                  </span>
                                )}
                              </div>
                              {isGM && (
                                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 shrink-0"
                                  onClick={() => handleRollMonsterAttack(p, action)}>
                                  <Dices className="w-3 h-3" /> Roll
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monster attributes */}
                    {isMonster && (snap.attributes || []).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Attributes</p>
                        <div className="space-y-1">
                          {snap.attributes.map((a) => (
                            <div key={a.name} className="text-xs text-foreground/80">
                              <span className="font-semibold text-foreground">{a.name}.</span> {a.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddParticipantModal
          activeGroup={activeGroup}
          groupCharacters={groupCharacters}
          onAdd={(data) => addParticipantMutation.mutate(data)}
          onClose={() => setShowAddModal(false)}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}