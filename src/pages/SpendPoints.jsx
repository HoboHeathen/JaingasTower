import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer';
import { toast } from 'sonner';

export default function SpendPoints() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const queryClient = useQueryClient();

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
  const totalPoints = character.total_points || 20;
  const remaining = totalPoints - spentPoints;

  const getUnlockedNodeIds = (treeId) =>
    unlocked.filter((s) => s.tree_id === treeId).map((s) => s.node_id);

  const handleUnlock = (treeId, node) => {
    if (remaining < node.cost) {
      toast.error('Not enough skill points!');
      return;
    }

    const alreadyUnlocked = unlocked.some(
      (s) => s.tree_id === treeId && s.node_id === node.id
    );
    if (alreadyUnlocked) return;

    const newUnlocked = [...unlocked, { tree_id: treeId, node_id: node.id }];
    updateMutation.mutate({
      unlocked_skills: newUnlocked,
      spent_points: spentPoints + node.cost,
    });
    toast.success(`Unlocked ${node.name}!`);
  };

  const handleReset = () => {
    updateMutation.mutate({
      unlocked_skills: [],
      spent_points: 0,
    });
    toast.success('All skills reset');
  };

  const groupedTrees = {
    primary: trees.filter((t) => t.category === 'primary'),
    secondary: trees.filter((t) => t.category === 'secondary'),
    tertiary: trees.filter((t) => t.category === 'tertiary'),
  };

  const defaultTab = trees.length > 0 ? trees[0].category : 'primary';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to={`/character?id=${characterId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {character.name} — Skill Points
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {remaining} points remaining
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({spentPoints} / {totalPoints} spent)
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2 text-destructive">
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
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="secondary">Secondary</TabsTrigger>
            <TabsTrigger value="tertiary">Tertiary</TabsTrigger>
          </TabsList>

          {['primary', 'secondary', 'tertiary'].map((cat) => (
            <TabsContent key={cat} value={cat}>
              {groupedTrees[cat].length === 0 ? (
                <div className="text-center py-16 bg-card border border-border/50 rounded-xl">
                  <p className="text-muted-foreground">No {cat} skill trees yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedTrees[cat].map((tree) => (
                    <div
                      key={tree.id}
                      className="bg-card border border-border/50 rounded-xl p-6"
                    >
                      <h2 className="font-heading text-xl font-semibold text-foreground mb-1">
                        {tree.name}
                      </h2>
                      {tree.description && (
                        <p className="text-sm text-muted-foreground mb-6">{tree.description}</p>
                      )}
                      <div className="flex justify-center overflow-x-auto py-4">
                        <SkillTreeViewer
                          tree={tree}
                          unlockedNodeIds={getUnlockedNodeIds(tree.id)}
                          onUnlock={(node) => handleUnlock(tree.id, node)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}