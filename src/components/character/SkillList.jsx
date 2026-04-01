import React from 'react';
import { Badge } from '@/components/ui/badge';

const categoryLabels = {
  primary: 'Primary Actions',
  secondary: 'Secondary Actions',
  tertiary: 'Tertiary Actions',
};

const categoryStyles = {
  primary: 'border-primary/30 bg-primary/5',
  secondary: 'border-accent/30 bg-accent/5',
  tertiary: 'border-chart-3/30 bg-chart-3/5',
};

const badgeStyles = {
  primary: 'bg-primary/20 text-primary border-primary/30',
  secondary: 'bg-accent/20 text-accent border-accent/30',
  tertiary: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
};

export default function SkillList({ category, skills }) {
  return (
    <div className={`rounded-xl border ${categoryStyles[category]} p-5`}>
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
        {categoryLabels[category]}
      </h3>
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No skills unlocked yet</p>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={`${skill.treeId}-${skill.id}`}
              className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{skill.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{skill.treeName}</p>
              </div>
              <Badge variant="outline" className={badgeStyles[category]}>
                {skill.cost} pts
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}