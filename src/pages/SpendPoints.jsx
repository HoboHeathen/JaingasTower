import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Plus, Minus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer.jsx';
import NodeDetailPanel from '@/components/skilltree/NodeDetailPanel';
import { toast } from 'sonner';

const CATEGORIES = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'spells', label: 'Spells' },
  { key: 'fighting_styles', label: 'Fighting Styles' },
  { key: 'stats', label: 'Stats' },
];

export default function SpendPoints() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState('');

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

  const unlocked = character?.unlocked_skills || [];
  const spentPoints = character?.spent_points || 0;
  const totalPoints = character?.total_points || 10;
  const remaining = totalPoints - spentPoints;

  const getUnlockedNodeIds = (treeId) =>
    unlocked.filter((s) => s.tree_id === treeId).map((s) => s.node_id);

  const handleUnlock = (treeId, node) => {
    if (remaining < 1) {
      toast.error('Not enough skill points!');
      return;
    }
    const alreadyUnlocked = unlocked.some((s) => s.tree_id === treeId && s.node_id === node.id);
    if (alreadyUnlocked) return;

    const updates = {
      unlocked_skills: [...unlocked, { tree_id: treeId, node_id: node.id }],
      spent_points: spentPoints + 1,
    };

    if (node.reload_modifier) {
      const reloadOrder = ['primary', 'secondary', 'tertiary'];
      const current = reloadOrder.indexOf(character.crossbow_reload || 'primary');
      const next = Math.max(0, Math.min(2, current + node.reload_modifier));
      updates.crossbow_reload = reloadOrder[next];
    }

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

  const handleRelease = (treeId, node) => {
    const newUnlocked = unlocked.filter((s) => !(s.tree_id === treeId && s.node_id === node.id));
    updateMutation.mutate({
      unlocked_skills: newUnlocked,
      spent_points: Math.max(0, spentPoints - 1),
    });
    toast.success(`Released ${node.name}`);
  };

  const handleReset = () => {
    updateMutation.mutate({ unlocked_skills: [], spent_points: 0 });
    toast.success('All skills reset');
  };

  const handleAdjustPoints = (delta) => {
    const newTotal = Math.max(0, totalPoints + delta);
    updateMutation.mutate({ total_points: newTotal });
  };

  const toggleCollapse = (treeId) => {
    setCollapsed((prev) => ({ ...prev, [treeId]: !prev[treeId] }));
  };

  // Filter trees by search query (tree name or node name)
  const filteredTrees = useMemo(() => {
    if (!search.trim()) return trees;
    const q = search.toLowerCase();
    return trees.filter((tree) => {
      if (tree.name.toLowerCase().includes(q)) return true;
      return (tree.nodes || []).some((n) => n.name.toLowerCase().includes(q));
    });
  }, [trees, search]);

  // Group filtered trees by category
  const grouped = useMemo(() => {
    const map = {};
    CATEGORIES.forEach((c) => { map[c.key] = []; });
    filteredTrees.forEach((tree) => {
      const cat = tree.tree_category || 'weapons';
      if (!map[cat]) map[cat] = [];
      map[cat].push(tree);
    });
    return map;
  }, [filteredTrees]);

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

  const isExpanded = (treeId) => collapsed[treeId] === true;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
              <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => handleAdjustPoints(-1)}>
                <Minus className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => handleAdjustPoints(1)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search trees or skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {trees.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <p className="text-muted-foreground mb-4">No skill trees exist yet.</p>
          <Link to="/skill-trees">
            <Button variant="outline">Go Create Skill Trees</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map(({ key, label }) => {
            const catTrees = grouped[key] || [];
            if (catTrees.length === 0) return null;
            return (
              <div key={key}>
                <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                  {label}
                </h2>
                <div className="space-y-2">
                  {catTrees.map((tree) => {
                    const open = isExpanded(tree.id);
                    return (
                      <div key={tree.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left"
                          onClick={() => toggleCollapse(tree.id)}
                        >
                          <div>
                            <h3 className="font-heading text-base font-semibold text-foreground">{tree.name}</h3>
                            {tree.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tree.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span className="text-xs text-muted-foreground">
                              {getUnlockedNodeIds(tree.id).length}/{(tree.nodes || []).length}
                            </span>
                            {open ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {open && (
                          <div className="px-5 pb-5 overflow-x-auto">
                            <SkillTreeViewer
                              tree={tree}
                              unlockedNodeIds={getUnlockedNodeIds(tree.id)}
                              onUnlock={(node) => handleUnlock(tree.id, node)}
                              onSelect={(node, status) => setSelectedNode({ node, treeId: tree.id, status })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredTrees.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No skill trees match your search.
            </div>
          )}
        </div>
      )}

      {/* Reset button */}
      <div className="mt-8 flex justify-center">
        <Button variant="outline" onClick={handleReset} className="gap-2 text-destructive">
          <RotateCcw className="w-4 h-4" />
          Reset All Skills
        </Button>
      </div>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode.node}
          status={selectedNode.status}
          remaining={remaining}
          onAcquire={(node) => handleUnlock(selectedNode.treeId, node)}
          onRelease={(node) => handleRelease(selectedNode.treeId, node)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}