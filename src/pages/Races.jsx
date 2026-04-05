import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STAT_FIELDS = [
  { key: 'bonus_points', label: 'Bonus Skill Points' },
  { key: 'base_health_bonus', label: 'Health Bonus' },
  { key: 'base_armor_bonus', label: 'Armor Bonus' },
  { key: 'base_speed_bonus', label: 'Speed Bonus' },
  { key: 'base_spell_range_bonus', label: 'Spell Range Bonus' },
  { key: 'str_bonus', label: 'STR Bonus' },
  { key: 'dex_bonus', label: 'DEX Bonus' },
  { key: 'con_bonus', label: 'CON Bonus' },
  { key: 'int_bonus', label: 'INT Bonus' },
  { key: 'wis_bonus', label: 'WIS Bonus' },
  { key: 'cha_bonus', label: 'CHA Bonus' },
];

const DEFAULT_FORM = {
  name: '', description: '', icon: '', special_traits: '',
  bonus_points: 0, base_health_bonus: 0, base_armor_bonus: 0,
  base_speed_bonus: 0, base_spell_range_bonus: 0,
  str_bonus: 0, dex_bonus: 0, con_bonus: 0, int_bonus: 0, wis_bonus: 0, cha_bonus: 0,
};

export default function Races() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showStats, setShowStats] = useState({});

  const { data: races = [], isLoading } = useQuery({
    queryKey: ['races'],
    queryFn: () => base44.entities.Race.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? base44.entities.Race.update(editing.id, data) : base44.entities.Race.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      setShowForm(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
      toast.success(editing ? 'Race updated' : 'Race created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Race.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      setDeleteTarget(null);
      toast.success('Race deleted');
    },
  });

  const openEdit = (race) => {
    setEditing(race);
    setForm({ ...DEFAULT_FORM, ...race });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    saveMutation.mutate(form);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const activeBonuses = (race) =>
    STAT_FIELDS.filter((f) => race[f.key] && race[f.key] !== 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Races</h1>
          <p className="text-muted-foreground mt-1">Define playable races and their stat modifiers</p>
        </div>
        <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Race
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : races.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No races created yet.</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Create Race
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => {
            const bonuses = activeBonuses(race);
            const open = showStats[race.id];
            return (
              <div key={race.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground">{race.name}</h3>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(race)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(race)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {race.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{race.description}</p>
                  )}
                  {bonuses.length > 0 && (
                    <div className="mt-3">
                      <button
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowStats((p) => ({ ...p, [race.id]: !p[race.id] }))}
                      >
                        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {bonuses.length} modifier{bonuses.length !== 1 ? 's' : ''}
                      </button>
                      {open && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {bonuses.map((b) => (
                            <Badge
                              key={b.key}
                              variant="outline"
                              className={cn(
                                'text-[10px] py-0',
                                race[b.key] > 0 ? 'text-green-400 border-green-400/40' : 'text-red-400 border-red-400/40'
                              )}
                            >
                              {race[b.key] > 0 ? '+' : ''}{race[b.key]} {b.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {race.special_traits && (
                    <p className="text-[11px] text-accent-foreground mt-2 italic leading-relaxed">{race.special_traits}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditing(null); setForm(DEFAULT_FORM); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Race' : 'New Race'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Elf" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Lore / flavour text..." rows={2} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Special Traits</label>
              <Textarea value={form.special_traits} onChange={(e) => setField('special_traits', e.target.value)} placeholder="Any special rules or passive abilities..." rows={2} />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Stat Modifiers</p>
              <div className="grid grid-cols-2 gap-2">
                {STAT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">{f.label}</label>
                    <Input
                      type="number"
                      value={form[f.key] ?? 0}
                      onChange={(e) => setField(f.key, Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(DEFAULT_FORM); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.name.trim() || saveMutation.isPending}>
                {editing ? 'Save Changes' : 'Create Race'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}