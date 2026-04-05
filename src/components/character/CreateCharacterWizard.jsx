import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import RaceSelectStep from './RaceSelectStep';
import RacialTreeSelectStep from './RacialTreeSelectStep';

const STEPS = ['Name', 'Race 1', 'Tree 1', 'Race 2', 'Tree 2'];

export default function CreateCharacterWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [race1Id, setRace1Id] = useState(null);
  const [tree1Id, setTree1Id] = useState(null);
  const [race2Id, setRace2Id] = useState(null);
  const [tree2Id, setTree2Id] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: races = [] } = useQuery({
    queryKey: ['races'],
    queryFn: () => base44.entities.Race.list('name'),
  });

  const { data: allRacialTrees = [] } = useQuery({
    queryKey: ['racial-trees'],
    queryFn: () => base44.entities.RacialTree.list(),
  });

  const trees1 = allRacialTrees.filter((t) => {
    const race = races.find((r) => r.id === race1Id);
    return race && t.race_name === race.name;
  });

  const trees2 = allRacialTrees.filter((t) => {
    const race = races.find((r) => r.id === race2Id);
    return race && t.race_name === race.name;
  });

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!race1Id;
    if (step === 2) return !!tree1Id;
    if (step === 3) return !!race2Id;
    if (step === 4) return !!tree2Id;
    return false;
  };

  const handleCreate = async () => {
    setSaving(true);
    const race1 = races.find((r) => r.id === race1Id);
    const race2 = races.find((r) => r.id === race2Id);
    const t1 = allRacialTrees.find((t) => t.id === tree1Id);
    const t2 = allRacialTrees.find((t) => t.id === tree2Id);

    // Sum bonuses from both races
    const bonusPoints = (race1?.bonus_points || 0) + (race2?.bonus_points || 0);

    await base44.entities.Character.create({
      name: name.trim(),
      race_name: `${race1?.name} / ${race2?.name}`,
      race_selections: [
        { race_id: race1Id, race_name: race1?.name, racial_tree_id: tree1Id, racial_tree_name: t1?.tree_name },
        { race_id: race2Id, race_name: race2?.name, racial_tree_id: tree2Id, racial_tree_name: t2?.tree_name },
      ],
      total_points: 10 + bonusPoints,
      spent_points: 0,
    });
    setSaving(false);
    onCreated();
  };

  const handleNext = () => {
    if (step === 4) {
      handleCreate();
    } else {
      // Reset tree selection when race changes
      if (step === 1) setTree1Id(null);
      if (step === 3) setTree2Id(null);
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Create Character</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 py-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-4 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-foreground">Character Name</label>
              <Input
                placeholder="Enter a name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canNext() && handleNext()}
                autoFocus
              />
            </div>
          )}
          {step === 1 && (
            <RaceSelectStep races={races} selectedRaceId={race1Id} onSelect={setRace1Id} />
          )}
          {step === 2 && (
            <RacialTreeSelectStep trees={trees1} selectedTreeId={tree1Id} onSelect={setTree1Id} raceNumber={1} />
          )}
          {step === 3 && (
            <RaceSelectStep races={races} selectedRaceId={race2Id} onSelect={setRace2Id} />
          )}
          {step === 4 && (
            <RacialTreeSelectStep trees={trees2} selectedTreeId={tree2Id} onSelect={setTree2Id} raceNumber={2} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button onClick={handleNext} disabled={!canNext() || saving} className="gap-1">
            {step === 4 ? (saving ? 'Creating...' : 'Create') : 'Next'}
            {step < 4 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}