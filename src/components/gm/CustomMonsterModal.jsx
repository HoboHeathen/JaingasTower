import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_MONSTER = {
  name: '',
  category: '',
  size: 'Medium',
  hp_type: 'standard',
  defense: 10,
  speed: '30ft',
  vulnerabilities: [],
  resistances: [],
  immunities: [],
  attributes: [],
  actions: [],
};

const EMPTY_ACTION = { name: '', action_slot: 'Primary', range: 'Melee', to_hit: '+0', damage_type: 'medium', damage_keyword: '', effect: '' };
const EMPTY_ATTR = { name: '', description: '' };

export default function CustomMonsterModal({ monster, userEmail, onClose, onSaved }) {
  const isEditing = !!monster;
  const [form, setForm] = useState(isEditing ? { ...monster } : { ...EMPTY_MONSTER });

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateAction = (i, field, value) => {
    const actions = [...(form.actions || [])];
    actions[i] = { ...actions[i], [field]: value };
    setField('actions', actions);
  };

  const updateAttr = (i, field, value) => {
    const attrs = [...(form.attributes || [])];
    attrs[i] = { ...attrs[i], [field]: value };
    setField('attributes', attrs);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const data = { ...form, owner_email: userEmail };
    if (isEditing) {
      await base44.entities.CustomMonster.update(monster.id, data);
      toast.success('Monster updated!');
    } else {
      await base44.entities.CustomMonster.create(data);
      toast.success('Custom monster created!');
    }
    onSaved();
  };

  const handleTagInput = (field, value) => {
    setField(field, value.split(',').map((s) => s.trim()).filter(Boolean));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? 'Edit Custom Monster' : 'New Custom Monster'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Monster name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <Input value={form.category || ''} onChange={(e) => setField('category', e.target.value)} placeholder="e.g. Undead, Beast" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Size</label>
              <Input value={form.size || ''} onChange={(e) => setField('size', e.target.value)} placeholder="Medium" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Speed</label>
              <Input value={form.speed || ''} onChange={(e) => setField('speed', e.target.value)} placeholder="30ft" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Defense</label>
              <Input type="number" value={form.defense || 10} onChange={(e) => setField('defense', parseInt(e.target.value) || 10)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">HP Type</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground"
                value={form.hp_type || 'standard'}
                onChange={(e) => setField('hp_type', e.target.value)}
              >
                {['weak', 'standard', 'tough', 'hulking'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-3 gap-3">
            {['vulnerabilities', 'resistances', 'immunities'].map((field) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground block mb-1 capitalize">{field} (comma-separated)</label>
                <Input
                  value={(form[field] || []).join(', ')}
                  onChange={(e) => handleTagInput(field, e.target.value)}
                  placeholder="Fire, Cold..."
                />
              </div>
            ))}
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Attributes</label>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                onClick={() => setField('attributes', [...(form.attributes || []), { ...EMPTY_ATTR }])}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {(form.attributes || []).map((attr, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input value={attr.name} onChange={(e) => updateAttr(i, 'name', e.target.value)} placeholder="Name" className="w-32 shrink-0" />
                  <Textarea value={attr.description} onChange={(e) => updateAttr(i, 'description', e.target.value)} placeholder="Description" className="flex-1 text-sm min-h-[40px]" />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setField('attributes', form.attributes.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Actions</label>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1"
                onClick={() => setField('actions', [...(form.actions || []), { ...EMPTY_ACTION }])}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {(form.actions || []).map((action, i) => (
                <div key={i} className="bg-secondary/20 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={action.name} onChange={(e) => updateAction(i, 'name', e.target.value)} placeholder="Action name" className="flex-1" />
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive shrink-0"
                      onClick={() => setField('actions', form.actions.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Slot</label>
                      <Input value={action.action_slot || ''} onChange={(e) => updateAction(i, 'action_slot', e.target.value)} placeholder="Primary" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Range</label>
                      <Input value={action.range || ''} onChange={(e) => updateAction(i, 'range', e.target.value)} placeholder="Melee" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">To Hit</label>
                      <Input value={action.to_hit || ''} onChange={(e) => updateAction(i, 'to_hit', e.target.value)} placeholder="+3" className="text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Damage Type</label>
                      <select
                        className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs text-foreground"
                        value={action.damage_type || ''}
                        onChange={(e) => updateAction(i, 'damage_type', e.target.value)}
                      >
                        <option value="">none</option>
                        {['light', 'medium', 'heavy', 'devastating'].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Effect</label>
                    <Textarea value={action.effect || ''} onChange={(e) => updateAction(i, 'effect', e.target.value)} placeholder="Optional effect description..." className="text-xs min-h-[36px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEditing ? 'Save Changes' : 'Create Monster'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}