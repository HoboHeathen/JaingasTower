import React from 'react';

export default function OtherSkillsBox({ skills }) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Other Skills</h3>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {skills.map((skill, i) => (
          <div key={skill.id ?? i} className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{skill.name}</p>
            {skill.treeName && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{skill.treeName}</p>
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