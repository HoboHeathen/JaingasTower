import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Pre-defined catalog items drawn from loot table
const CATALOG = [
  // Consumables
  { name: 'Light Health Potion', item_type: 'consumable', description: 'Restores a small amount of HP.' },
  { name: 'Medium Health Potion', item_type: 'consumable', description: 'Restores a moderate amount of HP.' },
  { name: 'Heavy Health Potion', item_type: 'consumable', description: 'Restores a large amount of HP.' },
  { name: 'Extra Life Totem', item_type: 'special', description: 'Grants an extra life during a run.' },
  // Type Components
  { name: 'Consumable Type Component', item_type: 'crafting_component', component_category: 'type' },
  { name: 'Upgrade I Type Component', item_type: 'crafting_component', component_category: 'type' },
  { name: 'Upgrade II Type Component', item_type: 'crafting_component', component_category: 'type' },
  { name: 'Upgrade III Type Component', item_type: 'crafting_component', component_category: 'type' },
  // Target Components
  { name: 'Weapon Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Primary Action Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Secondary Action Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Tertiary Action Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Light Attack Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Medium Attack Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Heavy Attack Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Defense Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Speed Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Move Action Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Damage Roll Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Attack Roll Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Contest Roll Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Poison Damage Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Fire Damage Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Frost Damage Target Component', item_type: 'crafting_component', component_category: 'target' },
  { name: 'Lightning Damage Target Component', item_type: 'crafting_component', component_category: 'target' },
  // Effect Components
  { name: 'Restore Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Double Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Triple Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Extra Die Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Reroll Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Fire Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Frost Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Lightning Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: 'Poison Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: '1d Poison Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: '1d Frost Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: '1d Fire Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
  { name: '1d Lightning Damage Effect Component', item_type: 'crafting_component', component_category: 'effect' },
];

const COMPONENT_CATEGORY_COLORS = {
  type: 'border-primary/40 text-primary',
  target: 'border-accent/40 text-accent-foreground',
  effect: 'border-chart-3/40 text-chart-3',
};

export default function AddItemModal({ characterId, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState({});

  const addMutation = useMutation({
    mutationFn: ({ item, quantity }) =>
      base44.entities.CharacterInventory.create({
        character_id: characterId,
        item_id: 'catalog_' + item.name.replace(/\s+/g, '_').toLowerCase(),
        item_name: item.name,
        item_type: item.item_type,
        component_category: item.component_category || null,
        quantity,
        crafted_description: item.description || null,
        max_charges: 0,
        current_charges: 0,
        slots_used: 0,
      }),
    onSuccess: (_, { item }) => {
      toast.success(`Added ${item.name} to inventory`);
      onAdded();
    },
  });

  const filtered = CATALOG.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const grouped = filtered.reduce((acc, item) => {
    const group = item.component_category || item.item_type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const GROUP_ORDER = ['consumable', 'special', 'type', 'target', 'effect'];
  const GROUP_LABELS = { consumable: 'Consumables', special: 'Special', type: 'Type Components', target: 'Target Components', effect: 'Effect Components' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <h2 className="font-heading text-lg font-bold">Add Item to Inventory</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="px-4 py-3 border-b border-border/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{GROUP_LABELS[group]}</p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 bg-secondary/20 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{item.name}</p>
                        {item.component_category && (
                          <Badge variant="outline" className={`text-[10px] mt-0.5 ${COMPONENT_CATEGORY_COLORS[item.component_category] || ''}`}>
                            {item.component_category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          value={qty[item.name] || 1}
                          onChange={(e) => setQty((q) => ({ ...q, [item.name]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="w-14 h-7 text-xs text-center px-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => addMutation.mutate({ item, quantity: qty[item.name] || 1 })}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}