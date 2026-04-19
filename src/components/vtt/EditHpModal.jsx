import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditHpModal({ token, onSave, onClose }) {
  const [current, setCurrent] = useState(String(token.current_hp ?? token.max_hp ?? 0));
  const [max, setMax] = useState(String(token.max_hp ?? 0));

  const handleSave = () => {
    onSave({ current_hp: parseInt(current) || 0, max_hp: parseInt(max) || 0 });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit HP — {token.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Current HP</label>
            <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max HP</label>
            <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}