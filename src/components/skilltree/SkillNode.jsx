import React from 'react';
import { Lock, Check, CircleDot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

// Color scheme per action category
const CATEGORY_COLORS = {
  primary: {
    unlocked: 'border-primary bg-primary/30 text-primary ring-2 ring-primary/40 cursor-default',
    available: 'border-primary/60 bg-primary/10 text-foreground cursor-pointer hover:border-primary hover:bg-primary/25 hover:shadow-lg hover:shadow-primary/10',
    icon: 'text-primary',
  },
  secondary: {
    unlocked: 'border-accent bg-accent/30 text-accent ring-2 ring-accent/40 cursor-default',
    available: 'border-accent/60 bg-accent/10 text-foreground cursor-pointer hover:border-accent hover:bg-accent/25 hover:shadow-lg hover:shadow-accent/10',
    icon: 'text-accent',
  },
  tertiary: {
    unlocked: 'border-chart-3 bg-chart-3/30 text-chart-3 ring-2 ring-chart-3/40 cursor-default',
    available: 'border-chart-3/60 bg-chart-3/10 text-foreground cursor-pointer hover:border-chart-3 hover:bg-chart-3/25 hover:shadow-lg hover:shadow-chart-3/10',
    icon: 'text-chart-3',
  },
};

const attackBadgeColor = {
  light: 'text-yellow-400',
  medium: 'text-orange-400',
  heavy: 'text-red-400',
};

export default function SkillNode({ node, status, onUnlock }) {
  const cat = node.category || 'primary';
  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.primary;

  const statusClass =
    status === 'locked'
      ? 'border-border/40 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed'
      : status === 'unlocked'
      ? colors.unlocked
      : colors.available;

  const handleClick = () => {
    if (status === 'available') onUnlock(node);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={status === 'available' ? { scale: 1.08 } : {}}
            whileTap={status === 'available' ? { scale: 0.95 } : {}}
            onClick={handleClick}
            className={`relative w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${statusClass}`}
          >
            {status === 'locked' && <Lock className="w-4 h-4" />}
            {status === 'available' && <CircleDot className={`w-4 h-4 ${colors.icon}`} />}
            {status === 'unlocked' && <Check className={`w-4 h-4 ${colors.icon}`} />}
            <span className="text-[9px] font-medium leading-tight text-center px-1 line-clamp-2">
              {node.name}
            </span>
            {node.attack_sub_category && (
              <span className={`text-[8px] font-bold uppercase ${attackBadgeColor[node.attack_sub_category] || ''}`}>
                {node.attack_sub_category}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-heading font-semibold">{node.name}</p>
            {node.description && <p className="text-xs text-muted-foreground">{node.description}</p>}
            <p className="text-xs font-medium text-primary">Cost: {node.cost} pt{node.cost !== 1 ? 's' : ''}</p>
            {node.attack_sub_category && (
              <p className="text-xs">
                <span className="text-muted-foreground">Attack: </span>
                <span className={attackBadgeColor[node.attack_sub_category]}>{node.attack_sub_category}</span>
              </p>
            )}
            {node.weapon_required && node.weapon_required !== 'any' && (
              <p className="text-xs text-muted-foreground capitalize">Weapon: {node.weapon_required.replace('_', ' ')}</p>
            )}
            {node.stat_bonuses && Object.entries(node.stat_bonuses).filter(([, v]) => v).length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Bonuses: </span>
                {Object.entries(node.stat_bonuses).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-accent ml-1">+{v} {k.replace('_', ' ')}</span>
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