import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function RenameTokenModal({ token, onSave, onClose }) {
  const [name, setName] = useState(token.name || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 w-[280px] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-sm font-semibold text-foreground">Rename Token</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Rename</Button>
        </div>
      </div>
    </div>
  );
}