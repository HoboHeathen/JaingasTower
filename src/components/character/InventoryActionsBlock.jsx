import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function InventoryActionsBlock({ characterId }) {
  const queryClient = useQueryClient();

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', characterId],
    queryFn: () => base44.entities.CharacterInventory.filter({ character_id: characterId }),
    enabled: !!characterId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharacterInventory.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', characterId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CharacterInventory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', characterId] }),
  });

  const consumables = inventory.filter((i) => i.item_type === 'consumable');
  const equippedUpgrades = inventory.filter((i) => i.item_type === 'upgrade' && i.is_equipped);

  const handleUseConsumable = (entry) => {
    if (entry.quantity <= 1) {
      deleteMutation.mutate(entry.id);
    } else {
      updateMutation.mutate({ id: entry.id, data: { quantity: entry.quantity - 1 } });
    }
    toast.success(`Used ${entry.item_name}!`);
  };

  const handleUseCharge = (entry) => {
    if (entry.current_charges <= 0) { toast.error('No charges remaining!'); return; }
    updateMutation.mutate({ id: entry.id, data: { current_charges: entry.current_charges - 1 } });
  };

  const handleResetCharges = (entry) => {
    updateMutation.mutate({ id: entry.id, data: { current_charges: entry.max_charges } });
    toast.success(`Charges reset for ${entry.item_name}`);
  };

  if (consumables.length === 0 && equippedUpgrades.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Inventory Actions</h2>
      </div>

      {consumables.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Consumables</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {consumables.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{entry.item_name}</p>
                  {entry.crafted_description && (
                    <p className="text-[10px] text-muted-foreground break-words">{entry.crafted_description}</p>
                  )}
                  {entry.quantity > 1 && (
                    <Badge variant="outline" className="text-[10px] mt-0.5">×{entry.quantity}</Badge>
                  )}
                </div>
                <Button size="sm" className="h-7 px-3 text-xs shrink-0" onClick={() => handleUseConsumable(entry)}>
                  Use
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {equippedUpgrades.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Equipped Upgrades</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {equippedUpgrades.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{entry.item_name}</p>
                  {entry.crafted_description && (
                    <p className="text-[10px] text-muted-foreground truncate">{entry.crafted_description}</p>
                  )}
                  {entry.max_charges > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: entry.max_charges }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full border ${i < entry.current_charges ? 'bg-primary border-primary' : 'border-border bg-secondary/30'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {entry.max_charges > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleUseCharge(entry)}>
                      Use
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleResetCharges(entry)} title="Reset charges">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}