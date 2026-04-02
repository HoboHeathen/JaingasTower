import React from 'react';
import SkillCard from './SkillCard';

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

const ATTACK_ORDER = { heavy: 0, medium: 1, light: 2 };

export default function SkillList({ category, skills, usedSkills = [], onMarkUsed }) {
  // Sort: heavy → medium → light, then alphabetical within
  const sorted = [...skills].sort((a, b) => {
    const ao = ATTACK_ORDER[a.attack_sub_category] ?? 3;
    const bo = ATTACK_ORDER[b.attack_sub_category] ?? 3;
    if (ao !== bo) return ao - bo;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className={`rounded-xl border ${categoryStyles[category]} p-4`}>
      <h3 className="font-heading text-base font-semibold text-foreground mb-3">
        {categoryLabels[category]}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No skills unlocked yet</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((skill) => (
            <SkillCard
              key={`${skill.treeId}-${skill.id}`}
              skill={skill}
              category={category}
              isUsed={usedSkills.includes(skill.id)}
              onMarkUsed={onMarkUsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}