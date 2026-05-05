import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const NODE_CATEGORIES = ['primary', 'secondary', 'tertiary', 'reactionary', 'passive'];
const EMPTY_NODE = { id: '', name: '', description: '', tier: 1, category: 'primary' };

function NodeForm({ node, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_NODE, ...node });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-secondary/10 border border-border/50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Node Name *</label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Claws, Night Vision" autoFocus />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Tier</label>
          <Input type="number" min={1} max={10} value={form.tier} onChange={(e) => set('tier', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Category</label>
          <Select value={form.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NODE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Description</label>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Skill description..." className="min-h-[80px] text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" onClick={() => { if (!form.name.trim()) return; onSave(form); }}>
          <Check className="w-3 h-3 mr-1" /> Save Node
        </Button>
      </div>
    </div>
  );
}

export default function EditRacialTree() {
  const urlParams = new URLSearchParams(window.location.search);
  const treeId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [editingNodeId, setEditingNodeId] = useState(null);
  const [addingNode, setAddingNode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});

  const { data: tree, isLoading } = useQuery({
    queryKey: ['racial-tree', treeId],
    queryFn: () => base44.entities.RacialTree.filter({ id: treeId }),
    select: (data) => data[0],
    enabled: !!treeId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RacialTree.update(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racial-tree', treeId] });
      queryClient.invalidateQueries({ queryKey: ['racial-trees'] });
      toast.success('Saved');
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }
  if (!tree) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Racial tree not found.</p>
        <Link to="/skill-trees" className="text-primary hover:underline mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const nodes = tree.nodes || [];

  const saveNode = (form) => {
    const updated = editingNodeId
      ? nodes.map((n) => n.id === editingNodeId ? { ...form } : n)
      : [...nodes, { ...form, id: `node_${Date.now()}` }];
    updateMutation.mutate({ nodes: updated });
    setEditingNodeId(null);
    setAddingNode(false);
  };

  const deleteNode = (nodeId) => {
    updateMutation.mutate({ nodes: nodes.filter((n) => n.id !== nodeId) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/skill-trees">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <h1 className="font-heading text-2xl font-bold text-foreground">{tree.tree_name}</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{tree.race_name} · Racial Tree</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setSettingsForm({ tree_name: tree.tree_name, race_name: tree.race_name, description: tree.description || '', is_standalone_skill: tree.is_standalone_skill || false }); setShowSettings(true); }} className="gap-2">
            <Pencil className="w-3.5 h-3.5" /> Settings
          </Button>
          <Button size="sm" onClick={() => { setAddingNode(true); setEditingNodeId(null); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Node
          </Button>
        </div>
      </div>

      {addingNode && (
        <div className="mb-4">
          <NodeForm node={{ ...EMPTY_NODE, id: '' }} onSave={saveNode} onCancel={() => setAddingNode(false)} />
        </div>
      )}

      {nodes.length === 0 && !addingNode ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-4">No nodes yet. Add your first node to get started.</p>
          <Button onClick={() => setAddingNode(true)} className="gap-2"><Plus className="w-4 h-4" /> Add First Node</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((node) => (
            <div key={node.id}>
              {editingNodeId === node.id ? (
                <NodeForm node={node} onSave={saveNode} onCancel={() => setEditingNodeId(null)} />
              ) : (
                <div className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-start gap-3 group hover:border-primary/30 transition-all">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">T{node.tier}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-foreground text-sm">{node.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground capitalize">{node.category}</span>
                    </div>
                    {node.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{node.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNodeId(node.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (window.confirm('Delete this node?')) deleteNode(node.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Tree Settings</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tree Name</label>
              <Input value={settingsForm.tree_name || ''} onChange={(e) => setSettingsForm((f) => ({ ...f, tree_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Race Name</label>
              <Input value={settingsForm.race_name || ''} onChange={(e) => setSettingsForm((f) => ({ ...f, race_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <Textarea value={settingsForm.description || ''} onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="standalone" checked={!!settingsForm.is_standalone_skill} onChange={(e) => setSettingsForm((f) => ({ ...f, is_standalone_skill: e.target.checked }))} />
              <label htmlFor="standalone" className="text-sm text-foreground">Standalone skill (not a progression tree)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={() => { updateMutation.mutate(settingsForm); setShowSettings(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}