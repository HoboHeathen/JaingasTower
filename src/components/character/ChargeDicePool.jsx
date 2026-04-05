import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ChargeDicePool({ current, limit, onCharge, onDeplete }) {
  if (limit <= 0) return null;

  const handleCharge = () => {
    if (current >= limit) {
      toast.warning(`Charged dice pool is full (${limit}/${limit})!`);
      return;
    }
    onCharge();
  };

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-heading font-semibold text-sm text-foreground">Charge Pool</span>
      </div>

      {/* Dice pip display */}
      <div className="flex gap-1.5 flex-1">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-7 h-7 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-all',
              i < current
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border/40 bg-secondary/20 text-muted-foreground/30'
            )}
          >
            {i < current ? '⚡' : '·'}
          </div>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-1">{current}/{limit}</span>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
        onClick={handleCharge}
      >
        + Charge
      </Button>
    </div>
  );
}