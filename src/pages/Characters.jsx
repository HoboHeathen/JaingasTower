import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CharacterCard from '@/components/character/CharacterCard';

export default function Characters() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: () => base44.entities.Character.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Character.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowCreate(false);
      setName('');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      total_points: 10,
      spent_points: 0,
      base_health: 10,
      base_armor: 10,
      base_speed: 15,
      base_spell_range: 0,
      crossbow_reload: 'primary',
      fire_damage: 'none',
      frost_damage: 'none',
      lightning_damage: 'none',
      necrotic_damage: 'none',
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Create Character</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              placeholder="Character name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}