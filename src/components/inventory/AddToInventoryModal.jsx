import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

function guessItemType(label) {
  if (label.includes('Type Component')) return { item_type: 'crafting_component', component_category: 'type' };
  if (label.includes('Target Component')) return { item_type: 'crafting_component', component_category: 'target' };
  if (label.includes('Effect Component')) return { item_type: 'crafting_component', component_category: 'effect' };
  if (label.includes('Potion') || label.includes('Totem')) return { item_type: 'consumable' };
  if (label.includes('gp')) return { item_type: 'gold' };
  if (label.includes('Skill Point')) return { item_type: 'skill_points' };
  return { item_type: 'special' };
}

const LAST_CHAR_KEY = 'lastSelectedCharacterId';

export default function AddToInventoryModal({ result, onClose }) {
  const [characterId, setCharacterId] = useState(() => localStorage.getItem(LAST_CHAR_KEY) || '');
  const queryClient = useQueryClient();

  const { data: characters = [] } = useQuery({
    queryKey: ['characters'],
    queryFn: () => base44.entities.Character.list(),
  });

  const addMutation = useMutation({
    mutationFn: () => {
      const { item_type, component_category } = guessItemType(result.result_label);
      return base44.entities.CharacterInventory.create({
        character_id: characterId,
        item_id: 'loot_' + result.result_label.replace(/\s+/g, '_').toLowerCase(),
        item_name: result.result_label,
        item_type,
        component_category: component_category || null,
        quantity: 1,
        max_charges: 0,
        current_charges: 0,
        slots_used: 0,
      });
    },
    onSuccess: () => {
      const char = characters.find((c) => c.id === characterId);
      localStorage.setItem(LAST_CHAR_KEY, characterId);
      toast.success(`Added to ${char?.name || 'character'}'s inventory`);
      queryClient.invalidateQueries({ queryKey: ['inventory', characterId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-bold">Add to Inventory</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Adding: <span className="text-foreground font-medium">{result.result_label}</span>
        </p>

        <Select value={characterId} onValueChange={(v) => { setCharacterId(v); localStorage.setItem(LAST_CHAR_KEY, v); }}>
          <SelectTrigger className="mb-4">
            <SelectValue placeholder="Select character..." />
          </SelectTrigger>
          <SelectContent>
            {characters.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="w-full gap-2"
          disabled={!characterId || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          <Plus className="w-4 h-4" /> Add to Inventory
        </Button>
      </div>
    </div>
  );
}