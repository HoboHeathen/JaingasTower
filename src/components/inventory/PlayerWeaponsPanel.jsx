import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, Sword } from 'lucide-react';
import { toast } from 'sonner';

const MAX_SLOTS = 3;

// Returns how many tier-slots a given upgrade item consumes (1, 2, or 3)
function getTier(item) {
  return item?.upgrade_tier || 1;
}

// Given 3 slot values (inventory IDs or null) and upgrade items,
// compute total slots used
function computeSlotsUsed(weapon, upgradeItems) {
  return [1, 2, 3].reduce((sum, slot) => {
    const id = weapon[`upgrade_slot_${slot}`];
    if (!id) return sum;
    const item = upgradeItems.find((u) => u.id === id);
    return sum + getTier(item);
  }, 0);
}

// Returns which physical slots (1,2,3) are actually occupied by a given upgrade item ID
// (an upgrade with tier=2 placed in slot 1 conceptually blocks slots 1&2)
function occupiedSlotsByItem(weapon, upgradeItems, targetSlot) {
  const id = weapon[`upgrade_slot_${targetSlot}`];
  if (!id) return [];
  const item = upgradeItems.find((u) => u.id === id);
  const tier = getTier(item);
  return Array.from({ length: tier }, (_, i) => targetSlot + i);
}

export default function PlayerWeaponsPanel({ characterId }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [openSlot, setOpenSlot] = useState(null); // { weaponId, slot }

  const { data: weapons = [], isLoading } = useQuery({
    queryKey: ['player-weapons', characterId],
    queryFn: () => base44.entities.PlayerWeapon.filter({ character_id: characterId }),
    enabled: !!characterId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', characterId],
    queryFn: () => base44.entities.CharacterInventory.filter({ character_id: characterId }),
    enabled: !!characterId,
  });

  const upgradeItems = inventory.filter((i) => i.item_type === 'upgrade');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlayerWeapon.create({ ...data, character_id: characterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-weapons', characterId] });
      setNewName('');
      setNewNotes('');
      toast.success('Weapon added!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerWeapon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-weapons', characterId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlayerWeapon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-weapons', characterId] });
      toast.success('Weapon removed.');
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), notes: newNotes.trim() });
  };

  const handleStartEdit = (weapon) => {
    setEditingId(weapon.id);
    setEditName(weapon.name);
    setEditNotes(weapon.notes || '');
  };

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id, data: { name: editName.trim(), notes: editNotes.trim() } });
  };

  // Assign an upgrade to a slot with full validation
  const handleAssignSlot = (weapon, slot, inventoryId) => {
    if (!inventoryId) {
      // Clear: also clear any subsequent slots that were "shadowed" by a multi-tier upgrade
      const updates = { [`upgrade_slot_${slot}`]: null };
      // If current slot held a multi-tier upgrade, clear the physical extension slots too
      const currentId = weapon[`upgrade_slot_${slot}`];
      if (currentId) {
        const currentItem = upgradeItems.find((u) => u.id === currentId);
        const tier = getTier(currentItem);
        for (let i = 1; i < tier; i++) {
          updates[`upgrade_slot_${slot + i}`] = null;
        }
      }
      updateMutation.mutate({ id: weapon.id, data: updates });
      setOpenSlot(null);
      return;
    }

    const item = upgradeItems.find((u) => u.id === inventoryId);
    const tier = getTier(item);

    // Check for duplicate on this weapon
    const alreadyEquipped = [1, 2, 3].some((s) => weapon[`upgrade_slot_${s}`] === inventoryId);
    if (alreadyEquipped) {
      toast.error('That upgrade is already equipped on this weapon.');
      return;
    }

    // Check if there's enough consecutive space from this slot
    const slotsNeeded = Array.from({ length: tier }, (_, i) => slot + i);
    if (slotsNeeded.some((s) => s > MAX_SLOTS)) {
      toast.error(`Upgrade ${['I','II','III'][tier-1]} needs ${tier} consecutive slot${tier>1?'s':''} starting at slot ${slot}, but the weapon only has ${MAX_SLOTS} slots.`);
      return;
    }

    // Check that all needed slots are empty
    const blockedSlots = slotsNeeded.filter((s) => weapon[`upgrade_slot_${s}`]);
    if (blockedSlots.length > 0) {
      toast.error(`Slot${blockedSlots.length > 1 ? 's' : ''} ${blockedSlots.join(', ')} already occupied. Remove existing upgrade${blockedSlots.length > 1 ? 's' : ''} first.`);
      return;
    }

    // All good — write the primary slot (extension slots are logically consumed, shown as occupied)
    updateMutation.mutate({ id: weapon.id, data: { [`upgrade_slot_${slot}`]: inventoryId } });
    setOpenSlot(null);
    toast.success(`Equipped ${item.item_name}`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Add new weapon form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input placeholder="Weapon name (e.g. Glaive)..." value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <Input placeholder="Notes (optional)..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="flex-1 hidden sm:block" />
        <Button type="submit" size="sm" className="gap-1.5 shrink-0" disabled={!newName.trim() || createMutation.isPending}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </form>

      {weapons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sword className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No weapons yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weapons.map((weapon) => {
            const slotsUsed = computeSlotsUsed(weapon, upgradeItems);
            const slotsLeft = MAX_SLOTS - slotsUsed;

            return (
              <div key={weapon.id} className="bg-card border border-border/50 rounded-xl p-4">
                {editingId === weapon.id ? (
                  <div className="space-y-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(weapon.id); if (e.key === 'Escape') setEditingId(null); }} />
                    <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes..." className="h-8 text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 flex-1 gap-1 text-xs" onClick={() => handleSaveEdit(weapon.id)}>
                        <Check className="w-3 h-3" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-sm text-foreground">{weapon.name}</h3>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleStartEdit(weapon)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(weapon.id)} className="text-destructive hover:opacity-70 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {weapon.notes && <p className="text-xs text-muted-foreground mb-2">{weapon.notes}</p>}

                    {/* Slot capacity indicator */}
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: MAX_SLOTS }).map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-sm ${i < slotsUsed ? 'bg-primary' : 'bg-secondary/50 border border-border/50'}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{slotsLeft} free</span>
                    </div>

                    {/* 3 upgrade slots */}
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upgrade Slots</p>
                      {[1, 2, 3].map((slot) => {
                        const itemId = weapon[`upgrade_slot_${slot}`];
                        const item = itemId ? upgradeItems.find((u) => u.id === itemId) : null;
                        const tier = item ? getTier(item) : 0;

                        // Is this slot "shadowed" by a multi-tier item placed in an earlier slot?
                        const shadowedBy = [1, 2, 3].filter((s) => s < slot).find((s) => {
                          const sId = weapon[`upgrade_slot_${s}`];
                          if (!sId) return false;
                          const sItem = upgradeItems.find((u) => u.id === sId);
                          return getTier(sItem) > slot - s;
                        });

                        if (shadowedBy) {
                          // This slot is consumed by a prior multi-tier upgrade — show as blocked
                          return (
                            <div key={slot} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-primary/60">
                              <span className="text-[10px] font-bold text-muted-foreground shrink-0">S{slot}</span>
                              <span className="truncate flex-1 italic text-[10px]">— used by slot {shadowedBy} upgrade —</span>
                            </div>
                          );
                        }

                        const isOpen = openSlot?.weaponId === weapon.id && openSlot?.slot === slot;

                        // Available upgrades: not already on this weapon, and fits in remaining space from this slot
                        const equippedIds = new Set([1,2,3].map((s) => weapon[`upgrade_slot_${s}`]).filter(Boolean));
                        const slotsFromHere = MAX_SLOTS - slot + 1;
                        const available = upgradeItems.filter((u) => !equippedIds.has(u.id) && getTier(u) <= slotsFromHere);

                        return (
                          <div key={slot} className="relative">
                            <button
                              onClick={() => setOpenSlot(isOpen ? null : { weaponId: weapon.id, slot })}
                              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all w-full text-left ${
                                item
                                  ? 'border-primary/50 bg-primary/10 text-primary'
                                  : 'border-dashed border-border/50 bg-secondary/20 text-muted-foreground hover:border-border'
                              }`}
                            >
                              <span className="text-[10px] font-bold text-muted-foreground shrink-0">S{slot}</span>
                              <span className="truncate flex-1">
                                {item ? `${item.item_name}${tier > 1 ? ` (Tier ${['I','II','III'][tier-1]})` : ''}` : 'Empty'}
                              </span>
                              {item && (
                                <button
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleAssignSlot(weapon, slot, null); }}
                                  title="Remove upgrade"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </button>
                            {isOpen && (
                              <div className="absolute z-20 top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl min-w-[200px] max-h-52 overflow-y-auto">
                                {available.length === 0 ? (
                                  <p className="px-3 py-2 text-xs text-muted-foreground">
                                    {slotsFromHere < 3 ? `No upgrades fit in ${slotsFromHere} remaining slot${slotsFromHere > 1 ? 's' : ''}` : 'No upgrades available'}
                                  </p>
                                ) : (
                                  available.map((u) => (
                                    <button
                                      key={u.id}
                                      className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-secondary/40 text-foreground"
                                      onClick={() => handleAssignSlot(weapon, slot, u.id)}
                                    >
                                      <span className="block truncate">{u.item_name}</span>
                                      <span className="text-[10px] text-muted-foreground">Tier {['I','II','III'][getTier(u)-1]} — uses {getTier(u)} slot{getTier(u) > 1 ? 's' : ''}</span>
                                    </button>
                                  ))
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
            );
          })}
        </div>
      )}
    </div>
  );
}