import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Hammer, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Wording templates
const TYPE_WORDING = {
  'Consumable Type Component': 'When consumed,',
  'Upgrade I Type Component': 'When installed on a weapon,',
  'Upgrade II Type Component': 'When installed on a weapon,',
  'Upgrade III Type Component': 'When installed on a weapon,',
};

const EFFECT_WORDING = {
  'Restore Effect Component': 'restore your',
  'Double Effect Component': 'double your',
  'Triple Effect Component': 'triple your',
  'Extra Die Effect Component': 'roll an extra die of the same type and add it to your next',
  'Frost Damage Effect Component': 'change your',
  'Fire Damage Effect Component': 'change your',
  'Lightning Damage Effect Component': 'change your',
  '1d Poison Effect Component': 'add 1 die of poison damage to your next',
  '1d Frost Damage Effect Component': 'add 1 die of Frost damage to your next',
  '1d Fire Damage Effect Component': 'add 1 die of Fire damage to your next',
  '1d Lightning Damage Effect Component': 'add 1 die of Lightning damage to your next',
  'Reroll Effect Component': 'reroll your next',
  'Poison Damage Effect Component': 'change your',
};

const EFFECT_SUFFIX = {
  'Frost Damage Effect Component': 'damage to Frost damage.',
  'Fire Damage Effect Component': 'damage to Fire damage.',
  'Lightning Damage Effect Component': 'damage to Lightning damage.',
  'Poison Damage Effect Component': 'damage to Poison damage.',
};

const TYPE_CHARGES = {
  'Consumable Type Component': 0,
  'Upgrade I Type Component': 1,
  'Upgrade II Type Component': 2,
  'Upgrade III Type Component': 3,
};

const TYPE_TIER = {
  'Consumable Type Component': 0,
  'Upgrade I Type Component': 1,
  'Upgrade II Type Component': 2,
  'Upgrade III Type Component': 3,
};

function buildDescription(typeName, effectName, targetName) {
  const typePrefix = TYPE_WORDING[typeName] || 'When used,';
  const effectMiddle = EFFECT_WORDING[effectName] || effectName;
  const suffix = EFFECT_SUFFIX[effectName] || '';
  const targetClean = targetName.replace(' Target Component', '').toLowerCase();
  const chargesText = TYPE_CHARGES[typeName] > 0 ? ` Has ${['one', 'two', 'three'][TYPE_CHARGES[typeName] - 1]} charge${TYPE_CHARGES[typeName] > 1 ? 's' : ''}.` : '';

  if (suffix) {
    return `${typePrefix} ${effectMiddle} ${targetClean} ${suffix}${chargesText}`;
  }
  return `${typePrefix} ${effectMiddle} ${targetClean}.${chargesText}`;
}

function buildCraftedName(typeName, effectName, targetName) {
  const typeShort = typeName.replace(' Type Component', '');
  const effectShort = effectName.replace(' Effect Component', '').replace(' Component', '');
  const targetShort = targetName.replace(' Target Component', '');
  return `${effectShort} ${targetShort} ${typeShort}`.trim();
}

export default function CraftingModal({ characterId, inventory, onClose, onCrafted }) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedEffect, setSelectedEffect] = useState(null);

  // Detect category — prefer stored field, fall back to name-based detection
  const detectCategory = (item) => {
    if (item.component_category) return item.component_category;
    const n = item.item_name || '';
    if (n.includes('Effect Component')) return 'effect';
    if (n.includes('Target Component')) return 'target';
    if (n.includes('Type Component')) return 'type';
    return null;
  };

  const typeComponents = inventory.filter((i) => i.item_type === 'crafting_component' && detectCategory(i) === 'type');
  const targetComponents = inventory.filter((i) => i.item_type === 'crafting_component' && detectCategory(i) === 'target');
  const effectComponents = inventory.filter((i) => i.item_type === 'crafting_component' && detectCategory(i) === 'effect');

  const preview = useMemo(() => {
    if (!selectedType || !selectedTarget || !selectedEffect) return null;
    const desc = buildDescription(selectedType.item_name, selectedEffect.item_name, selectedTarget.item_name);
    const name = buildCraftedName(selectedType.item_name, selectedEffect.item_name, selectedTarget.item_name);
    const tier = TYPE_TIER[selectedType.item_name] || 0;
    const charges = TYPE_CHARGES[selectedType.item_name] || 0;
    const isUpgrade = tier > 0;
    return { desc, name, tier, charges, isUpgrade };
  }, [selectedType, selectedTarget, selectedEffect]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create the crafted item in inventory
      await base44.entities.CharacterInventory.create({
        character_id: characterId,
        item_id: 'crafted_' + Date.now(),
        item_name: preview.name,
        item_type: preview.isUpgrade ? 'upgrade' : 'consumable',
        quantity: 1,
        upgrade_tier: preview.tier || null,
        max_charges: preview.charges,
        current_charges: preview.charges,
        crafted_description: preview.desc,
        slots_used: preview.tier || 0,
        component_category: null,
      });

      // Consume the components (reduce qty by 1 or delete)
      for (const comp of [selectedType, selectedTarget, selectedEffect]) {
        if (comp.quantity <= 1) {
          await base44.entities.CharacterInventory.delete(comp.id);
        } else {
          await base44.entities.CharacterInventory.update(comp.id, { quantity: comp.quantity - 1 });
        }
      }
    },
    onSuccess: () => {
      toast.success(`Crafted: ${preview.name}!`);
      onCrafted();
    },
  });

  const slotClass = (selected) =>
    `border-2 rounded-xl p-3 min-h-[80px] flex items-center justify-center text-center transition-all cursor-pointer ${
      selected
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-dashed border-border/50 bg-secondary/20 text-muted-foreground hover:border-border'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Hammer className="w-5 h-5 text-primary" /> Crafting
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Slot selectors */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Type', items: typeComponents, selected: selectedType, onSet: setSelectedType, color: 'text-primary' },
              { label: 'Target', items: targetComponents, selected: selectedTarget, onSet: setSelectedTarget, color: 'text-accent-foreground' },
              { label: 'Effect', items: effectComponents, selected: selectedEffect, onSet: setSelectedEffect, color: 'text-chart-3' },
            ].map(({ label, items, selected, onSet, color }) => (
              <div key={label}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${color}`}>{label}</p>
                <div className={slotClass(selected)}>
                  {selected ? (
                    <span className="text-xs font-medium">{selected.item_name}</span>
                  ) : (
                    <span className="text-xs">Select {label}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Component pickers */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Type', items: typeComponents, selected: selectedType, onSet: setSelectedType },
              { label: 'Target', items: targetComponents, selected: selectedTarget, onSet: setSelectedTarget },
              { label: 'Effect', items: effectComponents, selected: selectedEffect, onSet: setSelectedEffect },
            ].map(({ label, items, selected, onSet }) => (
              <div key={label} className="space-y-1 max-h-40 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">None in inventory</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSet(item)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                        selected?.id === item.id
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <span className="block truncate">{item.item_name}</span>
                      {item.quantity > 1 && <span className="text-[10px] opacity-60">×{item.quantity}</span>}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Preview */}
          {preview && (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Preview</p>
              <h3 className="font-heading font-bold text-foreground mb-1">{preview.name}</h3>
              <p className="text-sm text-muted-foreground">{preview.desc}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{preview.isUpgrade ? `Upgrade ${['I','II','III'][preview.tier-1]}` : 'Consumable'}</Badge>
                {preview.charges > 0 && <Badge variant="outline">{preview.charges} charge{preview.charges > 1 ? 's' : ''}</Badge>}
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            disabled={!preview || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Hammer className="w-4 h-4" />
            {createMutation.isPending ? 'Crafting...' : 'Craft Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}