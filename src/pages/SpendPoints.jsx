import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer';
import { toast } from 'sonner';

export default function SpendPoints() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState({});

  const { data: character, isLoading: loadingChar } = useQuery({
    queryKey: ['character', characterId],
    queryFn: () => base44.entities.Character.filter({ id: characterId }),
    select: (data) => data[0],
    enabled: !!characterId,
  });

  const { data: trees = [], isLoading: loadingTrees } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Character.update(characterId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', characterId] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });

  if (loadingChar || loadingTrees) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Character not found.</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const unlocked = character.unlocked_skills || [];
  const spentPoints = character.spent_points || 0;
  const totalPoints = character.total_points || 10;
  const remaining = totalPoints - spentPoints;

  const getUnlockedNodeIds = (treeId) =>
    unlocked.filter((s) => s.tree_id === treeId).map((s) => s.node_id);

  const handleUnlock = (treeId, node) => {
    if (remaining < node.cost) {
      toast.error('Not enough skill points!');
      return;
    }
    const alreadyUnlocked = unlocked.some((s) => s.tree_id === treeId && s.node_id === node.id);
    if (alreadyUnlocked) return;

    // Apply any stat modifiers from the node
    const updates = {
      unlocked_skills: [...unlocked, { tree_id: treeId, node_id: node.id }],
      spent_points: spentPoints + node.cost,
    };

    // Handle reload modifier
    if (node.reload_modifier) {
      const reloadOrder = ['primary', 'secondary', 'tertiary'];
      const current = reloadOrder.indexOf(character.crossbow_reload || 'primary');
      const next = Math.max(0, Math.min(2, current + node.reload_modifier));
      updates.crossbow_reload = reloadOrder[next];
    }

    // Handle elemental damage modifiers
    const dmgOrder = ['none', 'light', 'medium', 'heavy'];
    ['fire', 'frost', 'lightning', 'necrotic'].forEach((element) => {
      const mod = node[`${element}_damage_modifier`];
      if (mod) {
        const curIdx = dmgOrder.indexOf(character[`${element}_damage`] || 'none');
        const nextIdx = Math.max(0, Math.min(3, curIdx + mod));
        updates[`${element}_damage`] = dmgOrder[nextIdx];
      }
    });

    updateMutation.mutate(updates);
    toast.success(`Unlocked ${node.name}!`);
  };

  const handleReset = () => {
    updateMutation.mutate({
      unlocked_skills: [],
      spent_points: 0,
    });
    toast.success('All skills reset');
  };

  const handleAdjustPoints = (delta) => {
    const newTotal = Math.max(0, totalPoints + delta);
    updateMutation.mutate({ total_points: newTotal });
  };

  const toggleCollapse = (treeId) => {
    setCollapsed((prev) => ({ ...prev, [treeId]: !prev[treeId] }));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to={`/character?id=${characterId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
              {character.name} — Skill Points
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {remaining} remaining
              </Badge>
              <span className="text-xs text-muted-foreground">({spentPoints} / {totalPoints})</span>
              <div className="flex items-center gap-1 ml-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleAdjustPoints(-1)}
                  title="Remove a point"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleAdjustPoints(1)}
                  title="Add a point"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2 text-destructive w-full sm:w-auto">
          <RotateCcw className="w-4 h-4" />
          Reset All
        </Button>
      </div>

      {trees.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <p className="text-muted-foreground mb-4">No skill trees exist yet.</p>
          <Link to="/skill-trees">
            <Button variant="outline">Go Create Skill Trees</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trees.map((tree) => {
            const isCollapsed = collapsed[tree.id];
            return (
              <div key={tree.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                {/* Tree header - click to collapse */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left"
                  onClick={() => toggleCollapse(tree.id)}
                >
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">{tree.name}</h2>
                    {tree.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tree.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {getUnlockedNodeIds(tree.id).length}/{(tree.nodes || []).length}
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="px-5 pb-5 overflow-x-auto">
                    <SkillTreeViewer
                      tree={tree}
                      unlockedNodeIds={getUnlockedNodeIds(tree.id)}
                      onUnlock={(node) => handleUnlock(tree.id, node)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}