import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Plus, Minus, Search, Sword, Sparkles, Shield, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SkillTreeViewer from '@/components/skilltree/SkillTreeViewer.jsx';
import NodeDetailPanel from '@/components/skilltree/NodeDetailPanel';
import { toast } from 'sonner';

const CATEGORY_CONFIG = [
  { key: 'weapons', label: 'Weapons', icon: Sword },
  { key: 'spells', label: 'Spells', icon: Sparkles },
  { key: 'fighting_styles', label: 'Fighting Styles', icon: Shield },
  { key: 'stats', label: 'Stats', icon: BarChart2 },
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

  const filteredTrees = useMemo(() => {
    if (!search.trim()) return trees;
    const q = search.toLowerCase();
    return trees.filter((tree) => {
      if (tree.name.toLowerCase().includes(q)) return true;
      return (tree.nodes || []).some((n) => n.name?.toLowerCase().includes(q));
    });
  }, [trees, search]);

  const groupedTrees = useMemo(() => {
    const groups = {};
    CATEGORY_CONFIG.forEach(({ key }) => { groups[key] = []; });
    filteredTrees.forEach((tree) => {
      const cat = tree.tree_category || 'weapons';
      if (groups[cat]) groups[cat].push(tree);
      else groups['weapons'].push(tree);
    });
    return groups;
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

  const unlocked = character.unlocked_skills || [];
  const spentPoints = character.spent_points || 0;
  const totalPoints = character.total_points || 10;
  const remaining = totalPoints - spentPoints;

  const getUnlockedNodeIds = (treeId) =>
    unlocked.filter((s) => s.tree_id === treeId).map((s) => s.node_id);

  const handleUnlock = (treeId, node) => {
    const cost = 1; // all skills cost 1
    if (remaining < cost) {
      toast.error('Not enough skill points!');
      return;
    }
    const alreadyUnlocked = unlocked.some((s) => s.tree_id === treeId && s.node_id === node.id);
    if (alreadyUnlocked) return;

    const updates = {
      unlocked_skills: [...unlocked, { tree_id: treeId, node_id: node.id }],
      spent_points: spentPoints + cost,
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

  const renderTree = (tree) => {
    // default collapsed (undefined = collapsed), only open if explicitly set to false
    const isOpen = collapsed[tree.id] === false;
    return (
      <div key={tree.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left"
          onClick={() => setCollapsed((prev) => ({ ...prev, [tree.id]: prev[tree.id] === false ? true : false }))}
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
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {isOpen && (
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
  };

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
          {CATEGORY_CONFIG.map(({ key, label, icon: Icon }) => {
            const categoryTrees = groupedTrees[key] || [];
            if (categoryTrees.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                  <h2 className="font-heading text-base font-semibold text-primary uppercase tracking-wider">{label}</h2>
                  <div className="flex-1 h-px bg-border/50 ml-2" />
                </div>
                <div className="space-y-2">
                  {categoryTrees.map(renderTree)}
                </div>
              </div>
            );
          })}
          {filteredTrees.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No trees or skills match your search.</p>
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
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}