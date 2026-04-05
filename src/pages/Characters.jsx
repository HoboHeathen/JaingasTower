import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CharacterCard from '@/components/character/CharacterCard';
import CreateCharacterWizard from '@/components/character/CreateCharacterWizard';

export default function Characters() {
  const [showWizard, setShowWizard] = useState(false);
  const queryClient = useQueryClient();

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: () => base44.entities.Character.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Character.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Swords className="w-7 h-7 text-primary" />
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Characters</h1>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Character
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground mb-4">No characters yet. Create your first one!</p>
          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Character
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <CharacterCard key={char.id} character={char} onDelete={() => deleteMutation.mutate(char.id)} />
          ))}
        </div>
      )}

      {showWizard && (
        <CreateCharacterWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            setShowWizard(false);
          }}
        />
      )}
    </div>
  );
}