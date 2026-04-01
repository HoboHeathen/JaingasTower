import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, GitBranch, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function SkillNodeDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isEditing,
  prereqCandidates,
  onSave,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const togglePrereq = (nodeId) => {
    const current = form.prerequisites || [];
    const updated = current.includes(nodeId)
      ? current.filter((p) => p !== nodeId)
      : [...current, nodeId];
    setForm({ ...form, prerequisites: updated });
  };

  const selectedPrereqs = prereqCandidates.filter((n) =>
    (form.prerequisites || []).includes(n.id)
  );
  const unselectedPrereqs = prereqCandidates.filter(
    (n) => !(form.prerequisites || []).includes(n.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isEditing ? 'Edit Skill' : 'Add New Skill'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-2">
          <form id="node-form" onSubmit={handleSubmit} className="space-y-5 pb-2">
            {/* Name + Cost row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block">Skill Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Fireball, Parry, Shadow Step..."
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Point Cost</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this skill do? Describe its effect..."
                rows={3}
              />
            </div>

            {/* Tier */}
            <div>
              <Label className="mb-1.5 block">Tier (Tree Depth)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Tier 0 = root/starting skills. Higher tiers appear deeper in the tree.
              </p>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, tier: t })}
                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      form.tier === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {t === 0 ? 'Root' : `Tier ${t}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Category */}
            <div>
              <Label className="mb-1.5 block">Action Category</Label>
              <p className="text-xs text-muted-foreground mb-2">
                How this skill is categorized on the character sheet.
              </p>
              <div className="flex gap-2">
                {[
                  { value: 'primary', label: 'Primary', color: 'border-primary/50 bg-primary/10 text-primary' },
                  { value: 'secondary', label: 'Secondary', color: 'border-accent/50 bg-accent/10 text-accent' },
                  { value: 'tertiary', label: 'Tertiary', color: 'border-chart-3/50 bg-chart-3/10 text-chart-3' },
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, category: value })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.category === value
                        ? color
                        : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Stat Bonuses */}
            <div>
              <Label className="mb-1.5 block">Stat Bonuses <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'health', label: 'Health', color: 'text-red-400' },
                  { key: 'armor', label: 'Armor', color: 'text-blue-400' },
                  { key: 'speed', label: 'Speed', color: 'text-yellow-400' },
                  { key: 'spell_range', label: 'Spell Range', color: 'text-purple-400' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="bg-secondary/30 rounded-lg p-3">
                    <Label className={`text-xs mb-1.5 block ${color}`}>{label}</Label>
                    <Input
                      type="number"
                      className="h-8 text-center"
                      value={form.stat_bonuses?.[key] || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stat_bonuses: {
                            ...form.stat_bonuses,
                            [key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Prerequisites */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <Label>Prerequisites</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Players must unlock these skills before they can unlock this one. Use this to create branching paths.
              </p>

              {prereqCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No other skills to require yet.</p>
              ) : (
                <div className="space-y-4">
                  {/* Selected prerequisites */}
                  {selectedPrereqs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-primary mb-2">Required ({selectedPrereqs.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrereqs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => togglePrereq(n.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/30 text-primary rounded-lg text-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                          >
                            <span>{n.name}</span>
                            <span className="text-xs opacity-60">T{n.tier}</span>
                            <span className="text-xs">×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available to add */}
                  {unselectedPrereqs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Click to require:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unselectedPrereqs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => togglePrereq(n.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border text-muted-foreground rounded-lg text-sm hover:border-primary/50 hover:text-foreground transition-all"
                          >
                            <span>{n.name}</span>
                            <span className="text-xs opacity-50">T{n.tier}</span>
                            <span className="text-xs text-primary">+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form="node-form" type="submit" disabled={!form.name.trim()} className="gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Add Skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}