import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LinkCharacterModal({ token, groupCharacters = [], onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(token.character_id || '');

  const handleSave = () => {
    if (!selectedId) return;
    onSave(selectedId);
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-sm font-semibold text-foreground">Link Character to "{token.name}"</h2>
        <p className="text-sm text-muted-foreground">Select a character to link to this token. HP, name, and stats will be pulled from the character sheet.</p>
        <select
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Select character —</option>
          {groupCharacters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!selectedId}>Link</Button>
        </div>
      </div>
    </div>
  );
}