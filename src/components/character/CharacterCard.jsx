import React from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react';

export default function CharacterCard({ character }) {
  const pointsRemaining = (character.total_points || 20) - (character.spent_points || 0);
  const skillCount = (character.unlocked_skills || []).length;

  return (
    <Link
      to={`/character?id=${character.id}`}
      className="group block bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:bg-card/80 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {character.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {skillCount} skill{skillCount !== 1 ? 's' : ''} · {pointsRemaining} pts remaining
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}