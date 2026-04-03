import React from 'react';
import { X, Lock, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const attackBadge = {
  light: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  medium: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  heavy: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const categoryColor = {
  primary: 'text-primary border-primary/30 bg-primary/10',
  secondary: 'text-accent border-accent/30 bg-accent/10',
  tertiary: 'text-chart-3 border-chart-3/30 bg-chart-3/10',
};

export default function NodeDetailPanel({ node, status, onAcquire, onClose, remaining }) {
  if (!node) return null;

  const canAfford = remaining >= (node.cost || 1);
  const isUnlocked = status === 'unlocked';
  const isLocked = status === 'locked';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="font-heading text-lg font-bold text-foreground">{node.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {node.category && (
                <Badge variant="outline" className={`text-xs ${categoryColor[node.category]}`}>
                  {node.category}
                </Badge>
              )}
              {node.attack_sub_category && (
                <Badge variant="outline" className={`text-xs ${attackBadge[node.attack_sub_category]}`}>
                  {node.attack_sub_category}
                </Badge>
              )}
              {node.weapon_required && node.weapon_required !== 'any' && (
                <Badge variant="outline" className="text-xs text-muted-foreground capitalize">
                  {node.weapon_required.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{node.description}</p>
        )}

        {/* Stat bonuses */}
        {node.stat_bonuses && Object.entries(node.stat_bonuses).filter(([, v]) => v).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(node.stat_bonuses).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="text-xs bg-accent/10 text-accent rounded-md px-2 py-0.5">
                +{v} {k.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Cost & status */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-primary font-semibold">{node.cost || 1} pt{(node.cost || 1) !== 1 ? 's' : ''}</span>
            {!isUnlocked && !isLocked && (
              <span className="text-muted-foreground text-xs">({remaining} remaining)</span>
            )}
          </div>
          {isLocked && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <Lock className="w-3.5 h-3.5" />
              Requires prerequisites
            </div>
          )}
          {isUnlocked && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Check className="w-3.5 h-3.5" />
              Acquired
            </div>
          )}
        </div>

        {/* Acquire button */}
        {!isUnlocked && !isLocked && (
          <Button
            className="w-full"
            disabled={!canAfford}
            onClick={() => { onAcquire(node); onClose(); }}
          >
            {canAfford ? 'Acquire' : 'Not enough points'}
          </Button>
        )}
      </div>
    </div>
  );
}