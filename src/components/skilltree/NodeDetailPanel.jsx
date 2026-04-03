import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const attackColors = {
  light: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  medium: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
  heavy: 'bg-red-400/10 text-red-400 border-red-400/30',
};

const categoryColors = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  secondary: 'bg-accent/10 text-accent-foreground border-accent/30',
  tertiary: 'bg-chart-3/10 text-foreground border-chart-3/30',
};

export default function NodeDetailPanel({ node, status, remaining, onAcquire, onRelease, onClose }) {
  if (!node) return null;

  const isUnlocked = status === 'unlocked';
  const isLocked = status === 'locked';
  const canAfford = remaining >= node.cost;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border/50">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-foreground text-lg leading-tight">{node.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {node.category && (
                <Badge variant="outline" className={cn('text-xs', categoryColors[node.category])}>
                  {node.category}
                </Badge>
              )}
              {node.attack_sub_category && (
                <Badge variant="outline" className={cn('text-xs', attackColors[node.attack_sub_category])}>
                  {node.attack_sub_category}
                </Badge>
              )}
              {node.weapon_required && node.weapon_required !== 'any' && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {node.weapon_required}
                </Badge>
              )}
              {node.is_single_use && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Single Use
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-2" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {node.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{node.description}</p>
          )}

          {/* Stat bonuses */}
          {node.stat_bonuses && Object.entries(node.stat_bonuses).some(([, v]) => v) && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(node.stat_bonuses).map(([k, v]) =>
                v ? (
                  <span key={k} className="text-xs bg-secondary/60 px-2 py-1 rounded text-foreground capitalize">
                    +{v} {k.replace('_', ' ')}
                  </span>
                ) : null
              )}
            </div>
          )}

          {/* Cost row */}
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-muted-foreground">Cost</span>
            <span className={cn('font-semibold', !isUnlocked && !canAfford ? 'text-destructive' : 'text-foreground')}>
              {node.cost} pt{node.cost !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            {isUnlocked ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Acquired</span>
              </>
            ) : isLocked ? (
              <>
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prerequisites not met</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-accent-foreground">Available — {remaining} pts remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex flex-col gap-2">
          {!isUnlocked && !isLocked && (
            <Button
              className="w-full"
              disabled={!canAfford}
              onClick={() => {
                onAcquire(node);
                onClose();
              }}
            >
              {canAfford ? `Acquire (${node.cost} pt${node.cost !== 1 ? 's' : ''})` : 'Not enough points'}
            </Button>
          )}
          {isUnlocked && onRelease && (
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                onRelease(node);
                onClose();
              }}
            >
              Unacquire Skill
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}