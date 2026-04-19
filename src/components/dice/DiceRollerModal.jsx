import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import StandardRoller from './StandardRoller';
import FormulaRoller from './FormulaRoller';
import FavoritesRoller from './FavoritesRoller';

const TABS = [
  { id: 'standard', label: 'Standard' },
  { id: 'formula', label: 'Formula' },
  { id: 'favorites', label: 'Favorites' },
];

export default function DiceRollerModal({ onClose, character, onSaveFavorite, onRemoveFavorite, onShareRoll }) {
  const [activeTab, setActiveTab] = useState('standard');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground text-lg">Dice Roller</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50 px-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-2 px-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'standard' && (
            <StandardRoller onSaveFavorite={onSaveFavorite} onShareRoll={onShareRoll} />
          )}
          {activeTab === 'formula' && (
            <FormulaRoller onSaveFavorite={onSaveFavorite} onShareRoll={onShareRoll} />
          )}
          {activeTab === 'favorites' && (
            <FavoritesRoller
              favorites={character?.dice_favorites || []}
              onRemove={onRemoveFavorite}
            />
          )}
        </div>
      </div>
    </div>
  );
}