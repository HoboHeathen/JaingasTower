import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

const categoryColor = {
  primary: 'text-primary border-primary/40',
  secondary: 'text-accent-foreground border-accent/40',
  tertiary: 'text-chart-3 border-chart-3/40',
  reactionary: 'text-cyan-400 border-cyan-500/40',
  passive: 'text-muted-foreground border-border/60',
};

function RacialSkillCard({ node, isUnlocked, onToggle }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 transition-all',
        isUnlocked
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/40 bg-secondary/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground">{node.name}</p>
            <Badge
              variant="outline"
              className={cn('text-[9px] py-0', categoryColor[node.category] || categoryColor.passive)}
            >
              {node.category}
            </Badge>
          </div>
          {node.description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{node.description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant={isUnlocked ? 'default' : 'outline'}
          className="h-6 px-2 text-[10px] shrink-0"
          onClick={() => onToggle(node.id)}
        >
          {isUnlocked ? 'On' : 'Off'}
        </Button>
      </div>
    </div>
  );
}

export default function RacialSkillList({ character, racialTrees, onUpdateCharacter }) {
  const selections = character.race_selections || [];
  const unlockedRacial = character.unlocked_racial_skills || [];

  if (selections.length === 0) return null;

  const isUnlocked = (treeId, nodeId) =>
    unlockedRacial.some((u) => u.racial_tree_id === treeId && u.node_id === nodeId);

  const handleToggle = (treeId, nodeId) => {
    const alreadyUnlocked = isUnlocked(treeId, nodeId);
    let updated;
    if (alreadyUnlocked) {
      updated = unlockedRacial.filter((u) => !(u.racial_tree_id === treeId && u.node_id === nodeId));
    } else {
      updated = [...unlockedRacial, { racial_tree_id: treeId, node_id: nodeId }];
    }
    onUpdateCharacter({ unlocked_racial_skills: updated });
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-primary">Racial Skills</h3>
      </div>

      {selections.map((sel) => {
        const tree = racialTrees.find((t) => t.id === sel.racial_tree_id);
        if (!tree) return null;
        return (
          <div key={sel.racial_tree_id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground">{sel.race_name} — {tree.tree_name}</p>
            </div>
            <div className="space-y-1.5">
              {(tree.nodes || []).map((node) => (
                <RacialSkillCard
                  key={node.id}
                  node={node}
                  isUnlocked={isUnlocked(tree.id, node.id)}
                  onToggle={(nodeId) => handleToggle(tree.id, nodeId)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}