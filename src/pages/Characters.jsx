import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CharacterCard from '@/components/character/CharacterCard';
import RaceSelectStep from '@/components/character/RaceSelectStep';

export default function Characters() {
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1); // 1 = name, 2 = race
  const [name, setName] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const queryClient = useQueryClient();

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: () => base44.entities.Character.list('-created_date'),
  });

  const { data: races = [] } = useQuery({
    queryKey: ['races'],
    queryFn: () => base44.entities.Race.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Character.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setShowCreate(false);
    setStep(1);
    setName('');
    setSelectedRaceId(null);
  };

  const handleCreate = () => {
    const race = races.find((r) => r.id === selectedRaceId);
    createMutation.mutate({
      name: name.trim(),
      race_id: selectedRaceId || null,
      race_name: race?.name || null,
      total_points: 10 + (race?.bonus_points || 0),
      spent_points: 0,
      base_health: 10 + (race?.base_health_bonus || 0),
      base_armor: 10 + (race?.base_armor_bonus || 0),
      base_speed: 30 + (race?.base_speed_bonus || 0),
      base_spell_range: 0 + (race?.base_spell_range_bonus || 0),
      str: 8 + (race?.str_bonus || 0),
      dex: 8 + (race?.dex_bonus || 0),
      con: 8 + (race?.con_bonus || 0),
      int: 8 + (race?.int_bonus || 0),
      wis: 8 + (race?.wis_bonus || 0),
      cha: 8 + (race?.cha_bonus || 0),
      crossbow_reload: 'primary',
      used_single_use_skills: [],
      unlocked_skills: [],
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Characters</h1>
          <p className="text-muted-foreground mt-1">Manage your adventurers</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Character
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No characters yet. Create your first adventurer!</p>
          <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Character
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) closeDialog(); else setShowCreate(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {step === 1 ? 'Name Your Character' : 'Choose a Race'}
            </DialogTitle>
            {races.length > 0 && (
              <p className="text-xs text-muted-foreground">Step {step} of 2</p>
            )}
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <Input
                placeholder="Character name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { if (races.length > 0) setStep(2); else handleCreate(); } }}
                autoFocus
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                {races.length > 0 ? (
                  <Button disabled={!name.trim()} onClick={() => setStep(2)}>
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button disabled={!name.trim() || createMutation.isPending} onClick={handleCreate}>
                    Create
                  </Button>
                )}
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <RaceSelectStep races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button disabled={!selectedRaceId || createMutation.isPending} onClick={handleCreate}>
                  Create Character
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}