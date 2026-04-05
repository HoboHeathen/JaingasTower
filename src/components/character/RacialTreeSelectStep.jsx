import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const categoryColor = {
  primary: 'text-primary border-primary/40',
  secondary: 'text-accent-foreground border-accent/40',
  tertiary: 'text-chart-3 border-chart-3/40',
  reactionary: 'text-cyan-400 border-cyan-500/40',
  passive: 'text-muted-foreground border-border/60',
};

export default function RacialTreeSelectStep({ trees, selectedTreeId, onSelect, raceNumber }) {
  if (trees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No racial trees found for this race.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
      <p className="text-xs text-muted-foreground">
        Choose one skill tree for race {raceNumber}:
      </p>
      {trees.map((tree) => {
        const isSelected = selectedTreeId === tree.id;
        return (
          <button
            key={tree.id}
            type="button"
            onClick={() => onSelect(tree.id)}
            className={cn(
              'w-full text-left rounded-xl border p-4 transition-all',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border/50 bg-secondary/20 hover:bg-secondary/40'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-foreground">{tree.tree_name}</p>
                  {tree.is_standalone_skill && (
                    <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">Passive</Badge>
                  )}
                </div>
                {tree.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tree.description}</p>
                )}
                <div className="mt-2 space-y-1">
                  {(tree.nodes || []).map((node) => (
                    <div key={node.id} className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] py-0 shrink-0 mt-0.5', categoryColor[node.category] || categoryColor.passive)}
                      >
                        {node.category}
                      </Badge>
                      <div>
                        <span className="text-[11px] font-medium text-foreground">{node.name}: </span>
                        <span className="text-[11px] text-muted-foreground">{node.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}