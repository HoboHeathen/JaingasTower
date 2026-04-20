import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronRight, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export default function CharacterCard({ character, onDelete }) {
  const pointsRemaining = (character.total_points || 20) - (character.spent_points || 0);
  const skillCount = (character.unlocked_skills || []).length;

  const [open, setOpen] = useState(false);

  return (
    <div className="group relative bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:bg-card/80 transition-all">
      <Link to={`/character?id=${character.id}`} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {character.portrait_url
              ? <img src={character.portrait_url} alt="Portrait" className="w-full h-full object-cover" />
              : <User className="w-6 h-6 text-primary" />
            }
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {character.name}
            </h3>
            {character.race_selections?.length > 0 && (
              <p className="text-xs italic text-muted-foreground leading-tight">
                {character.race_selections.map((r) => r.race_name).filter(Boolean).join(' / ')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {skillCount} skill{skillCount !== 1 ? 's' : ''} · {pointsRemaining} pts remaining
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mr-8" />
      </Link>

      <button
        className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{character.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this character and all their skill progress. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}