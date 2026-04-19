import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, Sword, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

function UpgradeSlot({ slotNum, weaponId, slotValue, upgrades, onAssign }) {
  const [open, setOpen] = useState(false);
  const equipped = upgrades.find((u) => u.id === slotValue);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all w-full text-left ${
          equipped
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-dashed border-border/50 bg-secondary/20 text-muted-foreground hover:border-border'
        }`}
      >
        <span className="text-[10px] font-bold text-muted-foreground shrink-0">S{slotNum}</span>
        <span className="truncate flex-1">{equipped ? equipped.item_name : 'Empty'}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl min-w-[180px] max-h-48 overflow-y-auto">
          <button
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
            onClick={() => { onAssign(null); setOpen(false); }}
          >
            — Clear slot
          </button>
          {upgrades.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No upgrades in inventory</p>
          )}
          {upgrades.map((u) => (
            <button
              key={u.id}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-secondary/40 ${
                u.id === slotValue ? 'text-primary bg-primary/10' : 'text-foreground'
              }`}
              onClick={() => { onAssign(u.id); setOpen(false); }}
            >
              <span className="block truncate">{u.item_name}</span>
              {u.upgrade_tier && <span className="text-[10px] text-muted-foreground">Tier {u.upgrade_tier}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerWeaponsPanel({ characterId }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

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

  // Only upgrades available for slots
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

  const handleAssignSlot = (weaponId, slot, inventoryId) => {
    updateMutation.mutate({ id: weaponId, data: { [`upgrade_slot_${slot}`]: inventoryId || null } });
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Add new weapon form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="Weapon name (e.g. Glaive)..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Notes (optional)..."
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="flex-1 hidden sm:block"
        />
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
          {weapons.map((weapon) => (
            <div key={weapon.id} className="bg-card border border-border/50 rounded-xl p-4">
              {editingId === weapon.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(weapon.id); if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes..."
                    className="h-8 text-sm"
                  />
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

                  {/* 3 upgrade slots */}
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upgrade Slots</p>
                    {[1, 2, 3].map((slot) => (
                      <UpgradeSlot
                        key={slot}
                        slotNum={slot}
                        weaponId={weapon.id}
                        slotValue={weapon[`upgrade_slot_${slot}`] || null}
                        upgrades={upgradeItems}
                        onAssign={(invId) => handleAssignSlot(weapon.id, slot, invId)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}