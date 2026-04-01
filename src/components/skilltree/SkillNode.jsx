import React from 'react';
import { Lock, Check, CircleDot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

export default function SkillNode({ node, status, onUnlock }) {
  // status: 'locked' | 'available' | 'unlocked'
  const statusStyles = {
    locked: 'border-border/40 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed',
    available: 'border-primary/50 bg-primary/10 text-foreground cursor-pointer hover:border-primary hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/10',
    unlocked: 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30 cursor-default',
  };

  const handleClick = () => {
    if (status === 'available') {
      onUnlock(node);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={status === 'available' ? { scale: 1.08 } : {}}
            whileTap={status === 'available' ? { scale: 0.95 } : {}}
            onClick={handleClick}
            className={`relative w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${statusStyles[status]}`}
          >
            {status === 'locked' && <Lock className="w-4 h-4" />}
            {status === 'available' && <CircleDot className="w-4 h-4 text-primary" />}
            {status === 'unlocked' && <Check className="w-4 h-4" />}
            <span className="text-[10px] font-medium leading-tight text-center px-1 line-clamp-2">
              {node.name}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-heading font-semibold">{node.name}</p>
            <p className="text-xs text-muted-foreground">{node.description}</p>
            <p className="text-xs font-medium text-primary">Cost: {node.cost} point{node.cost !== 1 ? 's' : ''}</p>
            {node.stat_bonuses && Object.entries(node.stat_bonuses).filter(([,v]) => v).length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Bonuses: </span>
                {Object.entries(node.stat_bonuses).filter(([,v]) => v).map(([k, v]) => (
                  <span key={k} className="text-accent ml-1">
                    +{v} {k.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
            {status === 'locked' && (
              <p className="text-xs text-destructive">Requires prerequisite skills</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}