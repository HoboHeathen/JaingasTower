import React, { useState } from 'react';
import { Sword, RefreshCw, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MAX_SLOTS = 3;

export default function WeaponUpgradesPanel({ characterId, upgrades, onUseCharge, onResetCharges }) {
  const [equipping, setEquipping] = useState(null); // weapon id or null
  const queryClient = useQueryClient();

  const { data: weapons = [] } = useQuery({
    queryKey: ['player-weapons', characterId],
    queryFn: () => base44.entities.PlayerWeapon.filter({ character_id: characterId }),
    enabled: !!characterId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharacterInventory.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', characterId] }),
  });

  const equippedByWeapon = (weaponId) =>
    upgrades.filter((u) => u.weapon_slot === weaponId && u.is_equipped);

  const usedSlots = (weaponId) =>
    equippedByWeapon(weaponId).reduce((sum, u) => sum + (u.upgrade_tier || 1), 0);

  // Upgrades not equipped on ANY weapon
  const freeUpgrades = upgrades.filter((u) => !u.is_equipped);

  const handleEquip = (upgrade, weaponId) => {
    const tier = upgrade.upgrade_tier || 1;
    const available = MAX_SLOTS - usedSlots(weaponId);
    if (tier > available) {
      toast.error(`Not enough upgrade slots! Need ${tier}, have ${available}.`);
      return;
    }
    // Check if already equipped on this weapon (prevent duplicates)
    const alreadyOnWeapon = equippedByWeapon(weaponId).some((u) => u.item_id === upgrade.item_id);
    if (alreadyOnWeapon) {
      toast.error('That upgrade is already equipped on this weapon.');
      return;
    }
    updateMutation.mutate({ id: upgrade.id, data: { is_equipped: true, weapon_slot: weaponId } });
    setEquipping(null);
    toast.success(`Equipped ${upgrade.item_name}`);
  };

  const handleUnequip = (upgrade) => {
    updateMutation.mutate({ id: upgrade.id, data: { is_equipped: false, weapon_slot: null } });
    toast.success(`Unequipped ${upgrade.item_name}`);
  };

  if (weapons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Sword className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No weapons added yet. Add weapons in the Weapons tab above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Each weapon has 3 upgrade slots. Upgrade I = 1 slot, Upgrade II = 2 slots, Upgrade III = 3 slots.</p>

      {weapons.map((weapon) => {
        const equipped = equippedByWeapon(weapon.id);
        const slotsUsed = usedSlots(weapon.id);
        const slotsLeft = MAX_SLOTS - slotsUsed;

        // Upgrades available for this weapon: not equipped anywhere, AND not a duplicate item on this weapon
        const equippedItemIds = new Set(equipped.map((u) => u.item_id));
        const availableUpgrades = freeUpgrades.filter((u) => !equippedItemIds.has(u.item_id));

        return (
          <div key={weapon.id} className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">{weapon.name}</h3>
                {weapon.notes && <span className="text-xs text-muted-foreground italic">— {weapon.notes}</span>}
              </div>
              {/* Slot pips */}
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_SLOTS }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm border ${i < slotsUsed ? 'bg-primary border-primary' : 'border-border bg-secondary/30'}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{slotsLeft} free</span>
              </div>
            </div>

            {/* Equipped upgrades */}
            <div className="space-y-2 mb-3">
              {equipped.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No upgrades equipped</p>
              ) : (
                equipped.map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{u.item_name}</p>
                      {u.crafted_description && <p className="text-[10px] text-muted-foreground truncate">{u.crafted_description}</p>}
                      <Badge variant="outline" className="text-[10px] mt-0.5">{u.upgrade_tier || 1} slot{(u.upgrade_tier || 1) > 1 ? 's' : ''}</Badge>
                      {/* Charge pips */}
                      {u.max_charges > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: u.max_charges }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < u.current_charges ? 'bg-primary border-primary' : 'border-border bg-secondary/30'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {u.max_charges > 0 && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => onUseCharge(u)}>Use</Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onResetCharges(u)} title="Reset charges">
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleUnequip(u)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Equip button */}
            {slotsLeft > 0 && availableUpgrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs gap-1"
                onClick={() => setEquipping(equipping === weapon.id ? null : weapon.id)}
              >
                <Plus className="w-3 h-3" /> Equip Upgrade
              </Button>
            )}
            {slotsLeft > 0 && availableUpgrades.length === 0 && upgrades.length > 0 && (
              <p className="text-xs text-muted-foreground text-center italic">All available upgrades equipped</p>
            )}

            {/* Upgrade picker */}
            {equipping === weapon.id && (
              <div className="mt-2 space-y-1 border border-border/50 rounded-lg p-2 bg-secondary/10">
                {availableUpgrades.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-1">No upgrades available</p>
                ) : (
                  availableUpgrades.map((u) => {
                    const tier = u.upgrade_tier || 1;
                    const fitsSlot = tier <= slotsLeft;
                    return (
                      <button
                        key={u.id}
                        disabled={!fitsSlot}
                        onClick={() => handleEquip(u, weapon.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                          fitsSlot
                            ? 'bg-secondary/40 hover:bg-secondary/70 text-foreground'
                            : 'opacity-40 cursor-not-allowed text-muted-foreground bg-secondary/20'
                        }`}
                      >
                        <span className="truncate">{u.item_name}</span>
                        <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                          {tier} slot{tier > 1 ? 's' : ''}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}