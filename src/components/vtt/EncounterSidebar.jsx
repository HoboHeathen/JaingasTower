import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Swords, Heart, Shield, ChevronUp, ChevronDown,
  Dices, Trash2, RotateCcw, User, Skull, Pencil, Check, X,
  ChevronRight, Play, StopCircle, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDamage, getDiceCount } from '@/lib/bestiaryData';
import AddParticipantModal from '@/components/encounter/AddParticipantModal';

function rollD20() { return Math.floor(Math.random() * 20) + 1; }

const CONDITIONS = ['Blinded', 'Charmed', 'Dazed', 'Frightened', 'Grappled', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned'];

export default function EncounterSidebar({
  activeGroup,
  activeMap,
  isGM,
  user,
  groupCharacters,
  vttTokens,
  isOpen,
  onToggle,
  onActiveTokenChange,
  onRoundChange,
}) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [hpInputs, setHpInputs] = useState({});
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const dieType = activeGroup?.die_type || 'd6';
  const hpAveraged = activeGroup?.hp_averaged || false;

  // Fetch encounters scoped to this map
  const { data: encounters = [] } = useQuery({
    queryKey: ['encounters', activeGroup?.id, activeMap?.id],
    queryFn: () => base44.entities.Encounter.filter({ group_id: activeGroup.id, map_id: activeMap.id }),
    enabled: !!activeGroup?.id && !!activeMap?.id,
    refetchInterval: 5000,
  });

  const activeEncounter = encounters.find((e) => e.is_active) || encounters[0] || null;
  const floorWave = activeEncounter?.wave_number || activeGroup?.floor_wave_number || 1;

  const { data: participants = [] } = useQuery({
    queryKey: ['encounter-participants', activeEncounter?.id],
    queryFn: () => base44.entities.EncounterParticipant.filter({ encounter_id: activeEncounter.id }),
    enabled: !!activeEncounter?.id,
    refetchInterval: 3000,
  });

  const sortedParticipants = [...participants].sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1));

  // Helper: find VttToken matching a participant (by character_id or monster_id/name)
  const findVttToken = (participant) => {
    if (!participant) return null;
    if (participant.character_id) return vttTokens.find((t) => t.character_id === participant.character_id) || null;
    return vttTokens.find((t) => t.monster_id === participant.monster_id || t.name === participant.name) || null;
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createEncounterMutation = useMutation({
    mutationFn: () => base44.entities.Encounter.create({
      group_id: activeGroup.id,
      map_id: activeMap.id,
      is_active: false,
      round: 1,
      wave_number: activeGroup?.floor_wave_number || 1,
      name: `Encounter ${encounters.length + 1}`,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['encounters'] }),
  });

  const renameEncounterMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.Encounter.update(id, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['encounters'] }); setRenamingId(null); },
  });

  const deleteEncounterMutation = useMutation({
    mutationFn: async (encId) => {
      const parts = await base44.entities.EncounterParticipant.filter({ encounter_id: encId });
      for (const p of parts) await base44.entities.EncounterParticipant.delete(p.id);
      await base44.entities.Encounter.delete(encId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      queryClient.invalidateQueries({ queryKey: ['encounter-participants'] });
      onActiveTokenChange?.(null);
      toast.success('Encounter deleted.');
    },
  });

  const updateEncounterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Encounter.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      if (vars.data?.round != null) onRoundChange?.(vars.data.round);
    },
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
    mutationFn: (data) => base44.entities.EncounterParticipant.create({
      ...data,
      encounter_id: activeEncounter.id,
      group_id: activeGroup.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-participants'] });
      toast.success('Added to encounter!');
    },
  });

  // ── Encounter actions ─────────────────────────────────────────────────────

  const handleStartEncounter = () => {
    if (!activeEncounter) return;
    const firstParticipant = sortedParticipants[0] || null;
    const firstId = firstParticipant?.id || null;
    updateEncounterMutation.mutate({ id: activeEncounter.id, data: { is_active: true, active_token_id: firstId, round: 1 } });
    const vttToken = findVttToken(firstParticipant);
    onActiveTokenChange?.(vttToken?.id || null);
    onRoundChange?.(1);
    toast.success('Encounter started!');
  };

  const handleEndEncounter = () => {
    if (!activeEncounter) return;
    updateEncounterMutation.mutate({ id: activeEncounter.id, data: { is_active: false, active_token_id: null } });
    onActiveTokenChange?.(null);
  };

  const handleNextTurn = () => {
    if (!activeEncounter || sortedParticipants.length === 0) return;
    const currentIdx = sortedParticipants.findIndex((p) => p.id === activeEncounter.active_token_id);
    const nextIdx = (currentIdx + 1) % sortedParticipants.length;
    const nextParticipant = sortedParticipants[nextIdx] || null;
    const nextId = nextParticipant?.id || null;

    let newRound = activeEncounter.round || 1;
    if (nextIdx === 0) {
      newRound += 1;
      toast(`Round ${newRound} begins!`, { icon: '⚔️' });
    }

    updateEncounterMutation.mutate({ id: activeEncounter.id, data: { active_token_id: nextId, round: newRound } });
    const vttToken = findVttToken(nextParticipant);
    onActiveTokenChange?.(vttToken?.id || null);
  };

  const handleRollAllInitiative = () => {
    participants.forEach((p) => {
      let initiative;
      if (p.participant_type === 'player') {
        const char = groupCharacters.find((c) => c.id === p.character_id);
        const dexMod = char ? Math.floor(((char.dex || 8) - 10) / 2) : 0;
        initiative = rollD20() + dexMod;
      } else {
        initiative = rollD20() + Math.floor(floorWave / 2);
      }
      updateParticipantMutation.mutate({ id: p.id, data: { initiative } });
    });
    toast.success('Initiative rolled!');
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
    const toHit = parseInt((action.to_hit || '+0').replace('+', '')) || 0;
    const hitRoll = rollD20() + toHit;
    const damageRoll = action.damage_type
      ? `${formatDamage(action.damage_type, floorWave, dieType)} (${action.damage_type})`
      : '—';
    toast(`${participant.name} — ${action.name}: Hit ${hitRoll} | Damage: ${damageRoll}`, { duration: 6000 });
  };

  // ── Toggle button (always visible) ───────────────────────────────────────
  const toggleButton = (
    <button
      onClick={onToggle}
      title={isOpen ? 'Hide Encounter Panel' : 'Show Encounter Panel'}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
        isOpen
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      {isOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">Encounter</span>
      {activeEncounter?.is_active && (
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </button>
  );

  if (!isOpen) return <>{toggleButton}</>;

  return (
    <>
      {toggleButton}
      <div className="w-80 shrink-0 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden" style={{ maxHeight: '65vh' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span className="font-heading text-sm font-semibold">Encounter</span>
            {activeEncounter?.is_active && (
              <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                R{activeEncounter.round || 1}
              </Badge>
            )}
          </div>
          {isGM && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => createEncounterMutation.mutate()}>
              <Plus className="w-3 h-3" /> New
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Encounter list */}
          {encounters.length > 0 && (
            <div className="space-y-1">
              {encounters.map((enc) => (
                <div key={enc.id} className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                  enc.id === activeEncounter?.id ? 'bg-primary/10 border-primary/40' : 'bg-secondary/20 border-border/30'
                )}>
                  {renamingId === enc.id ? (
                    <>
                      <Input autoFocus className="h-6 text-xs flex-1" value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') renameEncounterMutation.mutate({ id: enc.id, name: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                      />
                      <button onClick={() => renameEncounterMutation.mutate({ id: enc.id, name: renameValue })} className="text-green-400"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setRenamingId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium truncate">{enc.name || 'Encounter'}</span>
                      {enc.is_active
                        ? <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 shrink-0">Active</Badge>
                        : isGM && (
                          <button
                            onClick={() => {
                              // Deactivate all first, then activate this one
                              Promise.all(encounters.filter(e => e.is_active).map(e => base44.entities.Encounter.update(e.id, { is_active: false }))).then(() => {
                                base44.entities.Encounter.update(enc.id, { is_active: true }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['encounters'] });
                                });
                              });
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 shrink-0"
                          >
                            Select
                          </button>
                        )
                      }
                      {isGM && <button onClick={() => { setRenamingId(enc.id); setRenameValue(enc.name || ''); }} className="text-muted-foreground hover:text-foreground shrink-0"><Pencil className="w-3 h-3" /></button>}
                      {isGM && <button onClick={() => deleteEncounterMutation.mutate(enc.id)} className="text-destructive hover:opacity-70 shrink-0"><Trash2 className="w-3 h-3" /></button>}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {encounters.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {isGM ? 'No encounters yet. Create one above.' : 'No active encounter.'}
            </p>
          )}

          {/* Active encounter controls */}
          {activeEncounter && (
            <>
              {/* Wave / Die type */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Wave {floorWave}</span>
                {isGM && (
                  <span className="flex items-center gap-0.5">
                    <button onClick={() => updateEncounterMutation.mutate({ id: activeEncounter.id, data: { wave_number: Math.max(1, floorWave - 1) } })} className="text-muted-foreground hover:text-foreground px-1 text-xs">−</button>
                    <button onClick={() => updateEncounterMutation.mutate({ id: activeEncounter.id, data: { wave_number: floorWave + 1 } })} className="text-muted-foreground hover:text-foreground px-1 text-xs">+</button>
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">Die:</span>
                {['d4','d6','d8','d10','d12'].map((d) => (
                  <button
                    key={d}
                    onClick={() => isGM && base44.entities.Group.update(activeGroup.id, { die_type: d }).then(() => queryClient.invalidateQueries({ queryKey: ['group'] }))}
                    className={`text-[10px] px-1 py-0.5 rounded border transition-all ${dieType === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              {isGM && (
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={handleRollAllInitiative}>
                    <Dices className="w-3 h-3" /> Roll Init
                  </Button>
                  {!activeEncounter.is_active ? (
                    <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={handleStartEncounter} disabled={participants.length === 0}>
                      <Play className="w-3 h-3" /> Start
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={handleNextTurn}>
                        <ChevronRight className="w-3 h-3" /> Next
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={handleEndEncounter}>
                        <StopCircle className="w-3 h-3" /> End
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateEncounterMutation.mutate({ id: activeEncounter.id, data: { round: (activeEncounter.round || 1) + 1 } })}>
                    <RotateCcw className="w-3 h-3" /> +Round
                  </Button>
                </div>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setShowAddModal(true)}>
                <Plus className="w-3 h-3" /> Add Combatant
              </Button>

              {/* Participant list */}
              <div className="space-y-1.5">
                {sortedParticipants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No combatants yet.</p>
                )}
                {sortedParticipants.map((p, i) => {
                  const isActiveTurn = activeEncounter.is_active && p.id === activeEncounter.active_token_id;
                  const isOpen = expandedId === p.id;
                  const maxHp = p.max_hp ?? 0;
                  const currentHp = p.current_hp ?? maxHp;
                  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 100;
                  const isMonster = p.participant_type === 'monster';
                  const snap = p.monster_snapshot || {};
                  const defense = isMonster
                    ? snap.defense
                    : groupCharacters.find((c) => c.id === p.character_id)?.base_armor;

                  return (
                    <div key={p.id} className={cn(
                      'rounded-xl border overflow-hidden transition-all',
                      isActiveTurn ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border/40 bg-card'
                    )}>
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/20"
                        onClick={() => setExpandedId(isOpen ? null : p.id)}
                      >
                        {/* Initiative */}
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          isActiveTurn ? 'bg-yellow-500/20 text-yellow-400' :
                          p.initiative != null ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
                        )}>
                          {p.initiative != null ? p.initiative : '—'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isMonster ? <Skull className="w-3 h-3 text-muted-foreground shrink-0" /> : <User className="w-3 h-3 text-primary shrink-0" />}
                            <span className={cn('text-xs font-semibold truncate', isActiveTurn ? 'text-yellow-300' : 'text-foreground')}>{p.name}</span>
                            {isActiveTurn && <ChevronRight className="w-3 h-3 text-yellow-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Heart className="w-2.5 h-2.5 text-red-400 shrink-0" />
                            <span className="text-[10px] text-red-400 font-semibold">{currentHp}/{maxHp}</span>
                            <div className="flex-1 h-1 bg-secondary/50 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${hpPct}%` }} />
                            </div>
                            {defense != null && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-400 shrink-0">
                                <Shield className="w-2.5 h-2.5" />{defense}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isGM && (
                            <button className="text-destructive hover:opacity-70"
                              onClick={(e) => { e.stopPropagation(); deleteParticipantMutation.mutate(p.id); }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
                          {/* Conditions */}
                          <div className="flex flex-wrap gap-1">
                            {CONDITIONS.map((c) => (
                              <button
                                key={c}
                                onClick={() => handleToggleCondition(p, c)}
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border',
                                  (p.conditions || []).includes(c)
                                    ? 'bg-destructive/20 text-destructive border-destructive/40'
                                    : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'
                                )}
                              >
                                {c}
                              </button>
                            ))}
                          </div>

                          {/* HP adjust */}
                          {isGM && (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                className="w-16 h-6 text-xs"
                                placeholder="±HP"
                                value={hpInputs[p.id] || ''}
                                onChange={(e) => setHpInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              />
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-green-400 border-green-500/30"
                                onClick={() => handleApplyHpChange(p, parseInt(hpInputs[p.id] || 0))}>
                                Heal
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-red-400 border-red-500/30"
                                onClick={() => handleApplyHpChange(p, -(parseInt(hpInputs[p.id] || 0)))}>
                                Dmg
                              </Button>
                              <Input
                                type="number"
                                className="w-14 h-6 text-xs"
                                placeholder="Init"
                                defaultValue={p.initiative ?? ''}
                                onBlur={(e) => updateParticipantMutation.mutate({ id: p.id, data: { initiative: parseInt(e.target.value) || 0 } })}
                              />
                            </div>
                          )}

                          {/* Monster actions */}
                          {isMonster && (snap.actions || []).length > 0 && (
                            <div className="space-y-1">
                              {snap.actions.map((action, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 bg-secondary/20 rounded px-2 py-1">
                                  <div className="text-[10px]">
                                    <span className="font-semibold text-foreground">{action.name}</span>
                                    {action.to_hit && action.to_hit !== '—' && <span className="text-muted-foreground ml-1">{action.to_hit}</span>}
                                    {action.damage_type && (
                                      <span className="ml-1 text-orange-400">
                                        {formatDamage(action.damage_type, floorWave, dieType)}
                                      </span>
                                    )}
                                  </div>
                                  {isGM && (
                                    <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] gap-1 shrink-0"
                                      onClick={() => handleRollMonsterAttack(p, action)}>
                                      <Dices className="w-2.5 h-2.5" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Monster attributes */}
                          {isMonster && (snap.attributes || []).length > 0 && (
                            <div className="space-y-0.5">
                              {snap.attributes.map((a) => (
                                <div key={a.name} className="text-[10px] text-foreground/80">
                                  <span className="font-semibold text-foreground">{a.name}.</span> {a.description}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {showAddModal && activeEncounter && (
          <AddParticipantModal
            activeGroup={activeGroup}
            groupCharacters={groupCharacters}
            onAdd={(data) => addParticipantMutation.mutate(data)}
            onClose={() => setShowAddModal(false)}
            userEmail={user?.email}
          />
        )}
      </div>
    </>
  );
}