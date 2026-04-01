import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer';
import { toast } from 'sonner';

const emptyNode = {
  id: '',
  name: '',
  description: '',
  cost: 1,
  tier: 0,
  prerequisites: [],
  stat_bonuses: { health: 0, armor: 0, speed: 0, spell_range: 0 },
};

export default function EditTree() {
  const urlParams = new URLSearchParams(window.location.search);
  const treeId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeForm, setNodeForm] = useState({ ...emptyNode });

  const { data: tree, isLoading } = useQuery({
    queryKey: ['skill-tree', treeId],
    queryFn: () => base44.entities.SkillTree.filter({ id: treeId }),
    select: (data) => data[0],
    enabled: !!treeId,
  });

  const updateMutation = useMutation({
    mutationFn: (nodes) => base44.entities.SkillTree.update(treeId, { nodes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-tree', treeId] });
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      toast.success('Skill tree saved');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Skill tree not found.</p>
        <Link to="/skill-trees" className="text-primary hover:underline mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const nodes = tree.nodes || [];

  const openAddNode = () => {
    const newId = `node_${Date.now()}`;
    setNodeForm({ ...emptyNode, id: newId });
    setEditingNode(null);
    setShowNodeDialog(true);
  };

  const openEditNode = (node) => {
    setNodeForm({
      ...node,
      stat_bonuses: node.stat_bonuses || { health: 0, armor: 0, speed: 0, spell_range: 0 },
      prerequisites: node.prerequisites || [],
    });
    setEditingNode(node.id);
    setShowNodeDialog(true);
  };

  const saveNode = (e) => {
    e.preventDefault();
    let updatedNodes;
    if (editingNode) {
      updatedNodes = nodes.map((n) => (n.id === editingNode ? { ...nodeForm } : n));
    } else {
      updatedNodes = [...nodes, { ...nodeForm }];
    }
    updateMutation.mutate(updatedNodes);
    setShowNodeDialog(false);
  };

  const deleteNode = (nodeId) => {
    const updatedNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        prerequisites: (n.prerequisites || []).filter((p) => p !== nodeId),
      }));
    updateMutation.mutate(updatedNodes);
  };

  const togglePrereq = (prereqId) => {
    const current = nodeForm.prerequisites || [];
    const updated = current.includes(prereqId)
      ? current.filter((p) => p !== prereqId)
      : [...current, prereqId];
    setNodeForm({ ...nodeForm, prerequisites: updated });
  };

  const otherNodes = nodes.filter((n) => n.id !== editingNode && n.id !== nodeForm.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/skill-trees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{tree.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{tree.description}</p>
          </div>
        </div>
        <Button onClick={openAddNode} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Skill
        </Button>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <p className="text-muted-foreground mb-4">No skills in this tree yet.</p>
          <Button onClick={openAddNode} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Skill
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visual tree */}
          <div className="bg-card border border-border/50 rounded-xl p-8 flex justify-center overflow-x-auto">
            <SkillTreeViewer
              tree={tree}
              unlockedNodeIds={[]}
              onUnlock={(node) => openEditNode(node)}
            />
          </div>

          {/* Node list for editing */}
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-3">All Skills</h2>
            {nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{node.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Tier {node.tier} · Cost {node.cost} · {(node.prerequisites || []).length} prereqs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditNode(node)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteNode(node.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingNode ? 'Edit Skill' : 'Add Skill'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveNode} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={nodeForm.name}
                onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                placeholder="Skill name..."
                autoFocus
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={nodeForm.description}
                onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                placeholder="What does this skill do?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost (points)</Label>
                <Input
                  type="number"
                  min={1}
                  value={nodeForm.cost}
                  onChange={(e) => setNodeForm({ ...nodeForm, cost: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Tier (depth)</Label>
                <Select
                  value={String(nodeForm.tier)}
                  onValueChange={(v) => setNodeForm({ ...nodeForm, tier: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((t) => (
                      <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Stat Bonuses</Label>
              <div className="grid grid-cols-2 gap-2">
                {['health', 'armor', 'speed', 'spell_range'].map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <Label className="text-xs capitalize w-20">{stat.replace('_', ' ')}</Label>
                    <Input
                      type="number"
                      className="h-8"
                      value={nodeForm.stat_bonuses?.[stat] || 0}
                      onChange={(e) =>
                        setNodeForm({
                          ...nodeForm,
                          stat_bonuses: {
                            ...nodeForm.stat_bonuses,
                            [stat]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {otherNodes.length > 0 && (
              <div>
                <Label className="mb-2 block">Prerequisites</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {otherNodes.map((n) => (
                    <div key={n.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={(nodeForm.prerequisites || []).includes(n.id)}
                        onCheckedChange={() => togglePrereq(n.id)}
                      />
                      <span className="text-sm">{n.name} (Tier {n.tier})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNodeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!nodeForm.name.trim()} className="gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}