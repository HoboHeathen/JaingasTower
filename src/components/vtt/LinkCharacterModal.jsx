import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function LinkCharacterModal({ token, groupCharacters = [], onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(token.character_id || '');

  const handleSave = () => {
    if (!selectedId) return;
    onSave(selectedId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Link Character to "{token.name}"</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select a character to link to this token. HP, name, and stats will be pulled from the character sheet.</p>
        <select
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Select character —</option>
          {groupCharacters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!selectedId}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}