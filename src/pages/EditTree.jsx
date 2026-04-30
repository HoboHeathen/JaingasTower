import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer';
import SkillNodeDialog from '@/components/skilltree/SkillNodeDialog';
import TreeSettingsDialog from '@/components/skilltree/TreeSettingsDialog';
import SkillNodeList from '@/components/skilltree/SkillNodeList';
import { toast } from 'sonner';

const emptyNode = {
  id: '',
  name: '',
  description: '',
  cost: 1,
  tier: 0,
  category: 'primary',
  attack_sub_category: 'light',
  weapon_required: 'any',
  is_single_use: false,
  damage_dice: undefined,
  damage_override_light: undefined,
  damage_override_medium: undefined,
  damage_override_heavy: undefined,
  reload_modifier: 0,
  fire_damage_modifier: 0,
  frost_damage_modifier: 0,
  lightning_damage_modifier: 0,
  necrotic_damage_modifier: 0,
  prerequisites: [],
  stat_bonuses: { health: 0, armor: 0, speed: 0, spell_range: 0 },
};

export default function EditTree() {
  const urlParams = new URLSearchParams(window.location.search);
  const treeId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [nodeForm, setNodeForm] = useState({ ...emptyNode });
  const [showSettings, setShowSettings] = useState(false);

  const { data: tree, isLoading } = useQuery({
    queryKey: ['skill-tree', treeId],
    queryFn: () => base44.entities.SkillTree.filter({ id: treeId }),
    select: (data) => data[0],
    enabled: !!treeId,
  });

  const updateNodesMutation = useMutation({
    mutationFn: (nodes) => base44.entities.SkillTree.update(treeId, { nodes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-tree', treeId] });
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      toast.success('Saved');
    },
  });

  const updateTreeMutation = useMutation({
    mutationFn: (data) => base44.entities.SkillTree.update(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-tree', treeId] });
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      toast.success('Tree settings saved');
      setShowSettings(false);
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
    setNodeForm({ ...emptyNode, id: `node_${Date.now()}` });
    setEditingNodeId(null);
    setShowNodeDialog(true);
  };

  const openEditNode = (node) => {
    setNodeForm({
      ...emptyNode,
      ...node,
      stat_bonuses: node.stat_bonuses || { health: 0, armor: 0, speed: 0, spell_range: 0 },
      prerequisites: node.prerequisites || [],
    });
    setEditingNodeId(node.id);
    setShowNodeDialog(true);
  };

  const saveNode = (form) => {
    const updatedNodes = editingNodeId
      ? nodes.map((n) => (n.id === editingNodeId ? { ...form } : n))
      : [...nodes, { ...form }];
    updateNodesMutation.mutate(updatedNodes);
    setShowNodeDialog(false);
  };

  const deleteNode = (nodeId) => {
    const updatedNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        prerequisites: (n.prerequisites || []).filter((p) => p !== nodeId),
      }));
    updateNodesMutation.mutate(updatedNodes);
  };

  // Other nodes available as prerequisites (exclude currently-editing node)
  const prereqCandidates = nodes.filter((n) => n.id !== editingNodeId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/skill-trees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{tree.name}</h1>
            {tree.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{tree.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)} className="gap-2">
            <Settings className="w-4 h-4" />
            Tree Settings
          </Button>
          <Button onClick={openAddNode} className="gap-2">
            <Plus className="w-4 h-4" />
            
          </Button>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-4">No skills yet. Add your first skill to get started.</p>
          <Button onClick={openAddNode} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Skill
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Visual tree preview */}
          <div className="xl:col-span-2 bg-card border border-border/50 rounded-xl p-6 overflow-x-auto">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              Visual Preview — click a node to edit it
            </p>
            <div className="flex justify-center min-h-[200px] items-center">
              <SkillTreeViewer
                tree={tree}
                unlockedNodeIds={[]}
                onUnlock={(node) => openEditNode(node)}
                editMode
              />
            </div>
          </div>

          {/* Node list panel */}
          <div className="xl:col-span-1">
            <SkillNodeList
              nodes={nodes}
              onEdit={openEditNode}
              onDelete={deleteNode}
              onAdd={openAddNode}
            />
          </div>
        </div>
      )}

      <SkillNodeDialog
        open={showNodeDialog}
        onOpenChange={setShowNodeDialog}
        form={nodeForm}
        setForm={setNodeForm}
        isEditing={!!editingNodeId}
        prereqCandidates={prereqCandidates}
        onSave={saveNode}
      />

      <TreeSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        tree={tree}
        onSave={(data) => updateTreeMutation.mutate(data)}
      />
    </div>
  );
}