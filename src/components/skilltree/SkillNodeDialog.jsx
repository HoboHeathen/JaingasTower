import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const WEAPONS = [
  { value: 'any', label: 'Any / None' },
  { value: 'polearm', label: 'Polearm (d8)' },
  { value: 'axe', label: 'Axe (d10)' },
  { value: 'sword', label: 'Sword (d6)' },
  { value: 'dagger', label: 'Dagger (d4)' },
  { value: 'hammer', label: 'Hammer (d12)' },
  { value: 'shortbow', label: 'Shortbow (d6)' },
  { value: 'longbow', label: 'Longbow (d10)' },
  { value: 'light_crossbow', label: 'Light Crossbow (d8)' },
  { value: 'heavy_crossbow', label: 'Heavy Crossbow (d12)' },
];

const DAMAGE_LEVELS = ['none', 'light', 'medium', 'heavy'];
const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12'];

function ToggleGroup({ options, value, onChange, colorMap }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(({ value: v, label, color }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            value === v
              ? color || 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SkillNodeDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isEditing,
  prereqCandidates,
  onSave,
}) {
  const nodeType = form.node_type || 'attack';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const togglePrereq = (nodeId) => {
    const current = form.prerequisites || [];
    setForm({
      ...form,
      prerequisites: current.includes(nodeId)
        ? current.filter((p) => p !== nodeId)
        : [...current, nodeId],
    });
  };

  const setNodeType = (type) => {
    const updates = { ...form, node_type: type };
    // Clear attack-specific fields when switching away from attack
    if (type !== 'attack') {
      updates.attack_sub_category = undefined;
      updates.damage_dice = undefined;
      updates.damage_override_light = undefined;
      updates.damage_override_medium = undefined;
      updates.damage_override_heavy = undefined;
    }
    // Clear action category when switching to stat_increase
    if (type === 'stat_increase') {
      updates.category = undefined;
    } else if (!updates.category) {
      updates.category = 'primary';
    }
    setForm(updates);
  };

  const STAT_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'str', label: 'STR' },
    { value: 'dex', label: 'DEX' },
    { value: 'con', label: 'CON' },
    { value: 'int', label: 'INT' },
    { value: 'wis', label: 'WIS' },
    { value: 'cha', label: 'CHA' },
  ];

  const selectedPrereqs = prereqCandidates.filter((n) => (form.prerequisites || []).includes(n.id));
  const unselectedPrereqs = prereqCandidates.filter((n) => !(form.prerequisites || []).includes(n.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isEditing ? 'Edit Skill' : 'Add New Skill'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2 overflow-hidden">
          <form id="node-form" onSubmit={handleSubmit} className="space-y-5 pb-2">

            {/* Name + Cost */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block">Skill Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Assassinate, Parry..."
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Point Cost</Label>
                <Input
                  type="number" min={1} max={20}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this skill do?"
                rows={2}
              />
            </div>

            {/* Node Type */}
            <div>
              <Label className="mb-1.5 block">Skill Type</Label>
              <ToggleGroup
                options={[
                  { value: 'attack', label: '⚔️ Attack', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
                  { value: 'skill', label: '✨ Skill', color: 'border-primary/50 bg-primary/10 text-primary' },
                  { value: 'augment', label: '🔧 Augment', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
                  { value: 'stat_increase', label: '📈 Stat Increase', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
                ]}
                value={nodeType}
                onChange={setNodeType}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {nodeType === 'attack' && 'An offensive action that appears in the character\'s action list with attack weight and dice.'}
                {nodeType === 'skill' && 'A non-attack action (Parry, Dodge, etc.) that appears in the character\'s action list.'}
                {nodeType === 'augment' && 'Modifies a specific attack weight (light/medium/heavy). Shown in its own Augments section, no roll button.'}
                {nodeType === 'stat_increase' && 'Passively improves stats or modifiers — does not appear as an action on the character sheet.'}
              </p>
            </div>

            {/* Augment attack type */}
            {nodeType === 'augment' && (
              <div>
                <Label className="mb-1.5 block">Modifies Attack Type</Label>
                <ToggleGroup
                  options={[
                    { value: 'light', label: 'Light', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
                    { value: 'medium', label: 'Medium', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
                    { value: 'heavy', label: 'Heavy', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
                    { value: 'any', label: 'Any', color: 'border-primary/50 bg-primary/10 text-primary' },
                  ]}
                  value={form.augment_attack_type || 'any'}
                  onChange={(v) => setForm({ ...form, augment_attack_type: v })}
                />
              </div>
            )}

            {/* Tier */}
            <div>
              <Label className="mb-1.5 block">Tier (Tree Depth)</Label>
              <p className="text-xs text-muted-foreground mb-2">Tier 1 = root/first. Higher tiers appear deeper.</p>
              <ToggleGroup
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => ({
                  value: t,
                  label: `Tier ${t}`,
                }))}
                value={form.tier}
                onChange={(v) => setForm({ ...form, tier: v })}
              />
            </div>

            {/* Stat Prerequisite */}
            <div>
              <Label className="mb-1.5 block">Ability Score Prerequisite <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <p className="text-xs text-muted-foreground mb-2">Lock this node unless the character meets the ability score requirement.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Stat Required</Label>
                  <Select
                    value={form.required_stat || ''}
                    onValueChange={(v) => setForm({ ...form, required_stat: v || undefined })}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Min Value</Label>
                  <Input
                    type="number" min={1} max={30}
                    value={form.required_stat_value || ''}
                    onChange={(e) => setForm({ ...form, required_stat_value: parseInt(e.target.value) || undefined })}
                    placeholder="e.g. 13"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Or Alt Stat</Label>
                  <Select
                    value={form.required_stat_alt || ''}
                    onValueChange={(v) => setForm({ ...form, required_stat_alt: v || undefined })}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Category — shown for attack and skill, not stat_increase */}
            {nodeType !== 'stat_increase' && (
              <div>
                <Label className="mb-1.5 block">Action Category</Label>
                <ToggleGroup
                  options={[
                    { value: 'primary', label: 'Primary', color: 'border-primary/50 bg-primary/10 text-primary' },
                    { value: 'secondary', label: 'Secondary', color: 'border-accent/50 bg-accent/10 text-accent' },
                    { value: 'tertiary', label: 'Tertiary', color: 'border-chart-3/50 bg-chart-3/10 text-chart-3' },
                    { value: 'reactionary', label: '⚡ Reactionary', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' },
                  ]}
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                />
              </div>
            )}

            {/* Attack-only fields */}
            {nodeType === 'attack' && (
              <>
                {/* Attack Weight */}
                <div>
                  <Label className="mb-1.5 block">Attack Weight</Label>
                  <ToggleGroup
                    options={[
                      { value: 'light', label: 'Light', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
                      { value: 'medium', label: 'Medium', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
                      { value: 'heavy', label: 'Heavy', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
                    ]}
                    value={form.attack_sub_category}
                    onChange={(v) => setForm({ ...form, attack_sub_category: v })}
                  />
                </div>
                <div>
                <Label className="mb-1.5 block">Action Category</Label>
                <ToggleGroup
                  options={[
                    { value: 'primary', label: 'Primary', color: 'border-primary/50 bg-primary/10 text-primary' },
                    { value: 'secondary', label: 'Secondary', color: 'border-accent/50 bg-accent/10 text-accent' },
                    { value: 'tertiary', label: 'Tertiary', color: 'border-chart-3/50 bg-chart-3/10 text-chart-3' },
                    { value: 'reactionary', label: '⚡ Reactionary', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' },
                  ]}
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                />
              </div>

                <Separator />

                {/* Weapon Required */}
                <div>
                  <Label className="mb-1.5 block">Weapon Required</Label>
                  <Select
                    value={form.weapon_required || 'any'}
                    onValueChange={(v) => setForm({ ...form, weapon_required: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEAPONS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Damage Dice */}
                <div>
                  <Label className="mb-1.5 block">Damage Dice Override</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Leave at "Weapon default" to use the weapon's die. Choose "Custom per attack weight" to set different dice per attack tier.
                  </p>
                  <Select
                    value={form.damage_dice || 'weapon_default'}
                    onValueChange={(v) => setForm({ ...form, damage_dice: v === 'weapon_default' ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Weapon default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weapon_default">Weapon default</SelectItem>
                      {DICE_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="custom">Custom per attack weight</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.damage_dice === 'custom' && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {['light', 'medium', 'heavy'].map((weight) => (
                        <div key={weight} className="bg-secondary/30 rounded-lg p-2">
                          <Label className="text-xs mb-1 block capitalize">{weight} attack</Label>
                          <Select
                            value={form[`damage_override_${weight}`] || ''}
                            onValueChange={(v) => setForm({ ...form, [`damage_override_${weight}`]: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {DICE_OPTIONS.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Weapon Required for non-attack skills (optional) */}
            {nodeType === 'skill' && (
              <div>
                <Label className="mb-1.5 block">Weapon Required <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select
                  value={form.weapon_required || 'any'}
                  onValueChange={(v) => setForm({ ...form, weapon_required: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAPONS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Single Use — shown for attack and skill */}
            {nodeType !== 'stat_increase' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_single_use: !form.is_single_use })}
                  className={`w-10 h-5 rounded-full border-2 transition-all relative ${
                    form.is_single_use ? 'bg-primary border-primary' : 'bg-muted border-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    form.is_single_use ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`} />
                </button>
                <div>
                  <Label className="cursor-pointer" onClick={() => setForm({ ...form, is_single_use: !form.is_single_use })}>
                    Single-use skill
                  </Label>
                  <p className="text-xs text-muted-foreground">Greys out on the character sheet after being rolled/used.</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Reload Modifier */}
            <div>
              <Label className="mb-1.5 block">Crossbow Reload Modifier</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Shift the reload action cost for crossbows when this skill is unlocked.
              </p>
              <ToggleGroup
                options={[
                  { value: -1, label: '↓ Faster (−1 tier)', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
                  { value: 0, label: 'No change', color: 'bg-secondary border-border text-foreground' },
                  { value: 1, label: '↑ Slower (+1 tier)', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
                ]}
                value={form.reload_modifier ?? 0}
                onChange={(v) => setForm({ ...form, reload_modifier: v })}
              />
            </div>

            {/* Magic Dice Modifiers */}
            <div>
              <Label className="mb-1.5 block">Magic Dice Modifiers</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Steps up a character's magic damage die when this skill is unlocked.
                Each +1 advances: d4 → d6 → d8 → d10 → d12.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'fire_dice_modifier', label: '🔥 Fire', color: 'text-orange-400' },
                  { key: 'frost_dice_modifier', label: '❄️ Frost', color: 'text-blue-400' },
                  { key: 'lightning_dice_modifier', label: '⚡ Lightning', color: 'text-yellow-400' },
                  { key: 'necrotic_dice_modifier', label: '💀 Necrotic', color: 'text-purple-400' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="bg-secondary/30 rounded-lg p-3">
                    <Label className={`text-xs mb-1.5 block ${color}`}>{label}</Label>
                    <ToggleGroup
                      options={[
                        { value: 0, label: '—' },
                        { value: 1, label: '+1' },
                        { value: 2, label: '+2' },
                      ]}
                      value={form[key] ?? 0}
                      onChange={(v) => setForm({ ...form, [key]: v })}
                    />
                  </div>
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
                  { key: 'str', label: 'STR', color: 'text-orange-400' },
                  { key: 'dex', label: 'DEX', color: 'text-green-400' },
                  { key: 'con', label: 'CON', color: 'text-red-300' },
                  { key: 'int', label: 'INT', color: 'text-blue-300' },
                  { key: 'wis', label: 'WIS', color: 'text-teal-400' },
                  { key: 'cha', label: 'CHA', color: 'text-pink-400' },
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
                          stat_bonuses: { ...form.stat_bonuses, [key]: parseInt(e.target.value) || 0 },
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
                Players must unlock these skills first.
              </p>

              {prereqCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No other skills to require yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPrereqs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-primary mb-2">Required ({selectedPrereqs.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrereqs.map((n) => (
                          <button
                            key={n.id} type="button" onClick={() => togglePrereq(n.id)}
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
                  {unselectedPrereqs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Click to require:</p>
                      <div className="flex flex-wrap gap-2">
                        {unselectedPrereqs.map((n) => (
                          <button
                            key={n.id} type="button" onClick={() => togglePrereq(n.id)}
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
          <Button form="node-form" type="submit" disabled={!form.name?.trim()} className="gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Add Skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}