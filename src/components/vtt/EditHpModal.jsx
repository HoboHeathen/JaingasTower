import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function EditHpModal({ token, onSave, onClose }) {
  const currentHp = token.current_hp ?? token.max_hp ?? 0;
  const maxHp = token.max_hp ?? 0;
  const [delta, setDelta] = useState('');
  const [newMax, setNewMax] = useState(String(maxHp));

  const applyDelta = (amount) => {
    const newCurrent = Math.max(0, currentHp + amount);
    onSave({ current_hp: newCurrent, max_hp: parseInt(newMax) || maxHp });
    onClose();
  };

  const handleFullHeal = () => {
    onSave({ current_hp: parseInt(newMax) || maxHp, max_hp: parseInt(newMax) || maxHp });
    onClose();
  };

  const deltaVal = parseInt(delta) || 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-heading text-sm">HP — {token.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current HP display */}
          <div className="text-center">
            <p className="text-4xl font-heading font-bold text-primary">{currentHp}</p>
            <p className="text-xs text-muted-foreground">/ {newMax} HP</p>
          </div>

          {/* Delta input with heal/damage buttons */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Amount"
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="border-green-500/40 text-green-400 hover:bg-green-500/10"
              onClick={() => applyDelta(deltaVal)}
              disabled={deltaVal <= 0}
            >
              + Heal
            </Button>
            <Button
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => applyDelta(-deltaVal)}
              disabled={deltaVal <= 0}
            >
              − Damage
            </Button>
          </div>

          {/* Max HP edit */}
          <div className="border-t border-border/40 pt-3">
            <label className="text-xs text-muted-foreground block mb-1">Max HP</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleFullHeal}>
                Full Heal
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}