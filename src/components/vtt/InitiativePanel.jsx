import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, ChevronRight, RotateCcw, Play, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15',
};

function rollD20() { return Math.floor(Math.random() * 20) + 1; }
function getDexMod(char) { return char?.dex ? Math.floor((char.dex - 10) / 2) : 0; }

export default function InitiativePanel({
  tokens,
  groupCharacters,
  isGM,
  initiativeStarted,
  initiativeOrder,     // [{tokenId, roll, name}]
  activeIndex,
  round,
  onStart,
  onEnd,
  onNextTurn,
  onSetOrder,
}) {
  const [rolling, setRolling] = useState(false);

  const handleRollAll = () => {
    setRolling(true);
    const order = tokens.map((token) => {
      const char = groupCharacters?.find((c) => c.id === token.character_id);
      const dexMod = getDexMod(char);
      const roll = rollD20() + dexMod;
      return { tokenId: token.id, name: token.name, type: token.type, color: token.color, roll };
    });
    order.sort((a, b) => b.roll - a.roll);
    onSetOrder(order);
    setRolling(false);
  };

  if (tokens.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          <span className="font-heading text-sm font-semibold">Initiative</span>
          {initiativeStarted && (
            <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Active</Badge>
          )}
          {initiativeStarted && round > 0 && (
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">Round {round}</Badge>
          )}
        </div>
        <div className="flex gap-1.5">
          {!initiativeStarted && isGM && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleRollAll} disabled={rolling}>
                <Dices className="w-3 h-3" /> Roll All
              </Button>
              {initiativeOrder.length > 0 && (
                <Button size="sm" className="h-7 text-xs gap-1" onClick={onStart}>
                  <Play className="w-3 h-3" /> Start
                </Button>
              )}
            </>
          )}
          {initiativeStarted && isGM && (
            <>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onNextTurn}>
                <ChevronRight className="w-3 h-3" /> Next
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={onEnd}>
                <RotateCcw className="w-3 h-3" /> End
              </Button>
            </>
          )}
        </div>
      </div>

      {initiativeOrder.length > 0 && (
        <div className="space-y-1">
          {initiativeOrder.map((entry, i) => {
            const isActive = initiativeStarted && i === activeIndex;
            return (
              <div
                key={entry.tokenId}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all',
                  isActive ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-secondary/30'
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: entry.color || TOKEN_COLORS[entry.type] || '#888' }} />
                <span className={cn('flex-1 font-medium', isActive ? 'text-yellow-300' : 'text-foreground')}>{entry.name}</span>
                <span className="font-mono text-muted-foreground">{entry.roll}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-yellow-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {initiativeOrder.length === 0 && !initiativeStarted && (
        <p className="text-xs text-muted-foreground">{isGM ? 'Roll initiative to set turn order.' : 'Waiting for GM to start initiative.'}</p>
      )}
    </div>
  );
}