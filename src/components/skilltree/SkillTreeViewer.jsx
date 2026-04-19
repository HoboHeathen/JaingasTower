import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const categoryColor = {
  primary: 'border-primary/60 bg-primary/10 text-primary',
  secondary: 'border-accent/60 bg-accent/10 text-accent-foreground',
  tertiary: 'border-chart-3/60 bg-chart-3/10 text-foreground',
};

const attackColor = {
  light: 'text-yellow-400',
  medium: 'text-orange-400',
  heavy: 'text-red-400',
};

function SkillNode({ node, status, onClick }) {
  const unlocked = status === 'unlocked';
  const available = status === 'available';
  const blocked = status === 'blocked';
  return (
    <button
      onClick={() => onClick(node, status)}
      className={cn(
        'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border text-center transition-all w-28',
        unlocked
          ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/20'
          : available
          ? `${categoryColor[node.category] || categoryColor.primary} hover:brightness-110 cursor-pointer`
          : blocked
          ? 'border-destructive/20 bg-destructive/5 text-muted-foreground opacity-40 cursor-not-allowed'
          : status === 'stat_locked'
          ? 'border-orange-400/30 bg-orange-400/5 text-orange-300 opacity-60 cursor-pointer'
          : 'border-border/30 bg-secondary/20 text-muted-foreground opacity-50 cursor-not-allowed'
      )}
    >
      <span className="text-xs font-semibold leading-tight">{node.name}</span>
      {node.attack_sub_category && (
        <span className={cn('text-[10px]', attackColor[node.attack_sub_category])}>
          {node.attack_sub_category}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">{node.cost} pt{node.cost !== 1 ? 's' : ''}</span>
      {unlocked && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border border-background" />
      )}
    </button>
  );
}

export default function SkillTreeViewer({ tree, unlockedNodeIds = [], blockedNodeIds = [], statLockedNodeIds = [], onUnlock, onSelect, editMode = false }) {
  const nodes = tree?.nodes || [];

  const isUnlocked = (id) => unlockedNodeIds.includes(id);
  const isBlocked = (id) => blockedNodeIds.includes(id);
  const isStatLocked = (id) => statLockedNodeIds.includes(id);

  const isAvailable = (node) => {
    if (isUnlocked(node.id)) return false;
    if (isBlocked(node.id)) return false;
    if (isStatLocked(node.id)) return false;
    const prereqs = node.prerequisites || [];
    return prereqs.every((pid) => isUnlocked(pid));
  };

  const getStatus = (node) => {
    if (isUnlocked(node.id)) return 'unlocked';
    if (isBlocked(node.id)) return 'blocked';
    if (isStatLocked(node.id)) return 'stat_locked';
    if (isAvailable(node)) return 'available';
    return 'locked';
  };

  const handleClick = (node, status) => {
    if (editMode) {
      onUnlock?.(node);
      return;
    }
    if (onSelect) {
      onSelect(node, status);
    } else if (status === 'available') {
      onUnlock?.(node);
    }
  };

  // Group nodes by tier
  const byTier = {};
  nodes.forEach((n) => {
    const t = n.tier ?? 0;
    if (!byTier[t]) byTier[t] = [];
    byTier[t].push(n);
  });
  const tiers = Object.keys(byTier).sort((a, b) => Number(a) - Number(b));

  if (nodes.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">No skills in this tree yet.</div>
    );
  }

  // Separate main-chain (attack) nodes vs augments for layout
  // Main chain: nodes that have attack_sub_category (attack weight)
  // Augments: all others
  // We lay out by tier: main chain in center column, augments branch left/right alternating

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {tiers.map((tier) => {
        const tierNodes = byTier[tier];
        const mainNodes = tierNodes.filter((n) => n.attack_sub_category);
        const augmentNodes = tierNodes.filter((n) => !n.attack_sub_category);

        const leftAugments = augmentNodes.filter((_, i) => i % 2 === 0);
        const rightAugments = augmentNodes.filter((_, i) => i % 2 === 1);

        return (
          <div key={tier} className="flex flex-col items-center gap-2 w-full">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Tier {tier}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* Left augments */}
              {leftAugments.map((node) => (
                <SkillNode
                  key={node.id}
                  node={node}
                  status={editMode ? 'available' : getStatus(node)}
                  onClick={handleClick}
                />
              ))}
              {/* Main chain nodes */}
              {mainNodes.map((node) => (
                <SkillNode
                  key={node.id}
                  node={node}
                  status={editMode ? 'available' : getStatus(node)}
                  onClick={handleClick}
                />
              ))}
              {/* Right augments */}
              {rightAugments.map((node) => (
                <SkillNode
                  key={node.id}
                  node={node}
                  status={editMode ? 'available' : getStatus(node)}
                  onClick={handleClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}