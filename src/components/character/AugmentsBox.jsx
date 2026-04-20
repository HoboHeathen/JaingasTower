import React from 'react';
import { cn } from '@/lib/utils';

const borderColor = {
  light: 'border-yellow-400/60',
  medium: 'border-orange-400/60',
  heavy: 'border-red-400/60',
  any: 'border-border',
};

const labelColor = {
  light: 'text-yellow-400',
  medium: 'text-orange-400',
  heavy: 'text-red-400',
  any: 'text-muted-foreground',
};

export default function AugmentsBox({ augments }) {
  if (!augments || augments.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Augments</h3>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {augments.map((skill, i) => (
          <div
            key={skill.node_id ?? skill.id ?? i}
            className={cn('rounded-lg border-l-4 bg-secondary/20 px-3 py-2', borderColor[skill.augment_attack_type] ?? 'border-border')}
          >
            <p className="text-sm font-medium text-foreground">{skill.name}</p>
            {skill.augment_attack_type && (
              <p className={cn('text-[10px] font-semibold mt-0.5', labelColor[skill.augment_attack_type])}>
                {skill.augment_attack_type === 'any' ? 'Any attack' : `${skill.augment_attack_type} attack`}
              </p>
            )}
            {skill.description && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{skill.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}