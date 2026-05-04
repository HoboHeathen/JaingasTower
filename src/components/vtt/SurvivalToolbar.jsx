import React from 'react';
import { Skull, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const SURVIVAL_TOOLS = [
  { key: 'spawn_point', label: 'Spawn Point', icon: Skull, gmOnly: true },
];

const SURVIVAL_COLORS = {
  spawn_point: 'bg-green-900 text-green-300 border-green-700',
};

export default function SurvivalToolbar({
  activeTool,
  onToolChange,
  isGM,
  onOpenWaveGenerator,
  onClearSpawnPoints,
  spawnPointCount,
}) {
  const visibleTools = SURVIVAL_TOOLS.filter((t) => !t.gmOnly || isGM);

  return (
    <div className="flex items-center gap-1 p-1.5 bg-card border border-border/60 rounded-xl flex-wrap">
      {/* Tool buttons */}
      {visibleTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.key;
        return (
          <button
            key={tool.key}
            title={tool.label}
            onClick={() => onToolChange(tool.key)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              isActive
                ? SURVIVAL_COLORS[tool.key] + ' ring-1 ring-primary/60 shadow-sm'
                : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        );
      })}

      {/* Wave Generator Button */}
      {isGM && (
        <>
          <div className="w-px h-5 bg-border/60 mx-1" />
          <button
            onClick={onOpenWaveGenerator}
            title="Generate Wave"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-transparent text-accent hover:bg-accent/10 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wave</span>
          </button>
        </>
      )}

      {/* Clear buttons */}


      {/* Active tool hint */}
      <div className="ml-auto text-[10px] text-muted-foreground italic hidden md:block">
        {activeTool === 'spawn_point' && 'Click/drag cells to place spawn points (GM only)'}
      </div>
    </div>
  );
}