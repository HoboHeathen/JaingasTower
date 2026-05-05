import React, { useState } from 'react';
import { Eye, EyeOff, Minus, DoorOpen, Square, Move, Eraser, Trash2, Ruler, Flame, Swords, Focus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = [
  { key: 'select', label: 'Select / Move', icon: Move, gmOnly: false },
  { key: 'measure', label: 'Measure', icon: Ruler, gmOnly: false },
  { key: 'fog_add', label: 'Add Fog', icon: Eye, gmOnly: true },
  { key: 'fog_erase', label: 'Erase Fog', icon: EyeOff, gmOnly: true },
  { key: 'wall', label: 'Wall', icon: Minus, gmOnly: true },
  { key: 'door', label: 'Door', icon: DoorOpen, gmOnly: true },
  { key: 'window', label: 'Window', icon: Square, gmOnly: true },
  { key: 'obstacle', label: 'Obstacle', icon: Square, gmOnly: true },
  { key: 'erase_wall', label: 'Erase Wall', icon: Eraser, gmOnly: true },
];

const TOOL_COLORS = {
  fog_add: 'bg-gray-700 text-white border-gray-500',
  fog_erase: 'bg-gray-600 text-white border-gray-400',
  wall: 'bg-slate-700 text-white border-slate-500',
  door: 'bg-amber-800 text-white border-amber-600',
  window: 'bg-cyan-800 text-white border-cyan-600',
  obstacle: 'bg-purple-800 text-white border-purple-600',
  erase_wall: 'bg-red-900 text-white border-red-700',
  select: 'bg-secondary text-foreground border-border',
};

export default function VttToolbar({
  activeTool,
  onToolChange,
  isGM,
  onClearFog,
  onClearWalls,
  fogCellCount,
  wallCount,
  isSurvivalMode,
  onToggleSurvivalMode,
  onToggleEncounterSidebar,
  showEncounterSidebar,
  encounterActive,
  forceShowLabels,
  onAddToken,
  onCenterOnActive,
  hasActiveToken,
}) {
  const visibleTools = TOOLS.filter((t) => !t.gmOnly || isGM);
  // On mobile, track which tool key was last tapped (to show its label)
  const [expandedTool, setExpandedTool] = useState(null);

  const handleToolClick = (key) => {
    setExpandedTool(key);
    onToolChange(key);
  };

  return (
    <div className="flex items-center gap-1 p-1.5 bg-card border border-border/60 rounded-xl flex-wrap">
      {/* Tool buttons */}
      {visibleTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.key;
        const showLabel = forceShowLabels || expandedTool === tool.key;
        return (
          <button
            key={tool.key}
            title={tool.label}
            onClick={() => handleToolClick(tool.key)}
            onBlur={() => { if (expandedTool === tool.key) setExpandedTool(null); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              isActive
                ? TOOL_COLORS[tool.key] + ' ring-1 ring-primary/60 shadow-sm'
                : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className={cn(showLabel ? 'inline' : 'hidden sm:inline')}>{tool.label}</span>
          </button>
        );
      })}

      {/* Add Token button (all users) */}
      {onAddToken && (
        <>
          <div className="w-px h-5 bg-border/60 mx-1" />
          <button
            onClick={onAddToken}
            title="Add Token"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-transparent bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className={cn(forceShowLabels ? 'inline' : 'hidden sm:inline')}>Add Token</span>
          </button>
        </>
      )}

      {/* Center on active token (when encounter is running) */}
      {onCenterOnActive && hasActiveToken && (
        <button
          onClick={onCenterOnActive}
          title="Center on active token"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-transparent text-yellow-400 hover:bg-yellow-500/10 transition-all"
        >
          <Focus className="w-3.5 h-3.5" />
          <span className={cn(forceShowLabels ? 'inline' : 'hidden sm:inline')}>Focus</span>
        </button>
      )}

      {/* Divider + clear actions (GM only) */}
      {isGM && (
        <>
          <div className="w-px h-5 bg-border/60 mx-1" />
          {fogCellCount > 0 && (
            <button
              onClick={onClearFog}
              title="Clear all fog"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-transparent text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className={cn(forceShowLabels ? 'inline' : 'hidden sm:inline')}>Clear Fog</span>
            </button>
          )}

          <button
            onClick={onToggleSurvivalMode}
            title="Toggle Survival Mode"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              isSurvivalMode
                ? 'bg-orange-900/60 text-orange-300 border-orange-700 ring-1 ring-orange-500/60'
                : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className={cn(forceShowLabels ? 'inline' : 'hidden sm:inline')}>Survival</span>
          </button>

          {onToggleEncounterSidebar && (
            <button
              onClick={onToggleEncounterSidebar}
              title="Toggle Encounter Panel"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                showEncounterSidebar
                  ? 'bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/40'
                  : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              <Swords className="w-3.5 h-3.5" />
              <span className={cn(forceShowLabels ? 'inline' : 'hidden sm:inline')}>Encounter</span>
              {encounterActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            </button>
          )}
        </>
      )}

      {/* Active tool hint */}
      <div className="ml-auto text-[10px] text-muted-foreground italic hidden md:block">
        {activeTool === 'select' && 'Drag tokens to move • Right-click token for options • Right-click empty = ping'}
        {activeTool === 'measure' && 'Click to set origin • drag to measure distance in feet'}
        {activeTool === 'fog_add' && 'Click/drag to add fog cells'}
        {activeTool === 'fog_erase' && 'Click/drag to erase fog cells'}
        {activeTool === 'wall' && 'Click/drag cells to place walls'}
        {activeTool === 'door' && 'Click/drag cells to place doors • Right-click door to open/close'}
        {activeTool === 'window' && 'Click/drag cells to place windows'}
        {activeTool === 'obstacle' && 'Click/drag cells to place obstacles'}
        {activeTool === 'erase_wall' && 'Click/drag to erase wall cells'}
      </div>
    </div>
  );
}