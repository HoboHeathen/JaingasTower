import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatBlock from '@/components/character/StatBlock';
import SkillList from '@/components/character/SkillList';

export default function CharacterSheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');

  const { data: character, isLoading: loadingChar } = useQuery({
    queryKey: ['character', characterId],
    queryFn: () => base44.entities.Character.filter({ id: characterId }),
    select: (data) => data[0],
    enabled: !!characterId,
  });

  const { data: trees = [], isLoading: loadingTrees } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list(),
  });

  if (loadingChar || loadingTrees) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Character not found.</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  const unlockedSkills = character.unlocked_skills || [];
  const pointsRemaining = (character.total_points || 20) - (character.spent_points || 0);

  // Build lookup for all unlocked skills with tree info
  const treeMap = {};
  trees.forEach((t) => {
    treeMap[t.id] = t;
  });

  // Calculate stat bonuses
  const skillBonuses = { health: 0, armor: 0, speed: 0, spell_range: 0 };
  const categorizedSkills = { primary: [], secondary: [], tertiary: [] };

  unlockedSkills.forEach(({ tree_id, node_id }) => {
    const tree = treeMap[tree_id];
    if (!tree) return;
    const node = (tree.nodes || []).find((n) => n.id === node_id);
    if (!node) return;

    if (node.stat_bonuses) {
      Object.entries(node.stat_bonuses).forEach(([k, v]) => {
        if (v && skillBonuses[k] !== undefined) skillBonuses[k] += v;
      });
    }

    const cat = node.category || tree.category || 'primary';
    if (categorizedSkills[cat]) {
      categorizedSkills[cat].push({
        ...node,
        treeId: tree.id,
        treeName: tree.name,
      });
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{character.name}</h1>
            <p className="text-muted-foreground mt-1">
              {pointsRemaining} of {character.total_points || 20} skill points remaining
            </p>
          </div>
        </div>
        <Link to={`/spend-points?id=${character.id}`}>
          <Button className="gap-2">
            <TreePine className="w-4 h-4" />
            Spend Points
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <StatBlock character={character} skillBonuses={skillBonuses} />

        <div className="grid gap-4 md:grid-cols-3">
          <SkillList category="primary" skills={categorizedSkills.primary} />
          <SkillList category="secondary" skills={categorizedSkills.secondary} />
          <SkillList category="tertiary" skills={categorizedSkills.tertiary} />
        </div>
      </div>
    </div>
  );
}