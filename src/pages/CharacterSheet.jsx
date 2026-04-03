import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TreePine, Plus, Minus, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatBlock from '@/components/character/StatBlock';
import AbilityScores from '@/components/character/AbilityScores';
import SkillList from '@/components/character/SkillList';
import DiceRollerModal from '@/components/dice/DiceRollerModal';

export default function CharacterSheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showDiceRoller, setShowDiceRoller] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Character.update(characterId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', characterId] });
    },
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
  const usedSingleUseSkills = character.used_single_use_skills || [];
  const totalPoints = character.total_points || 10;
  const spentPoints = character.spent_points || 0;
  const pointsRemaining = totalPoints - spentPoints;

  const treeMap = {};
  trees.forEach((t) => { treeMap[t.id] = t; });

  const skillBonuses = { health: 0, armor: 0, speed: 0, spell_range: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
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

    // stat_increase nodes don't appear in action lists
    if (node.node_type === 'stat_increase') return;

    const cat = node.category || 'primary';
    if (categorizedSkills[cat]) {
      categorizedSkills[cat].push({ ...node, treeId: tree.id, treeName: tree.name });
    }
  });

  const handleMarkUsed = (nodeId) => {
    const updated = [...usedSingleUseSkills];
    if (!updated.includes(nodeId)) updated.push(nodeId);
    updateMutation.mutate({ used_single_use_skills: updated });
  };

  const handleAdjustPoints = (delta) => {
    const newTotal = Math.max(0, totalPoints + delta);
    updateMutation.mutate({ total_points: newTotal });
  };

  const handleSaveFavorite = (fav) => {
    const current = character.dice_favorites || [];
    updateMutation.mutate({ dice_favorites: [...current, fav] });
  };

  const handleRemoveFavorite = (idx) => {
    const current = [...(character.dice_favorites || [])];
    current.splice(idx, 1);
    updateMutation.mutate({ dice_favorites: current });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{character.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {pointsRemaining} / {totalPoints} pts remaining
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleAdjustPoints(-1)} title="Remove a point">
                <Minus className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleAdjustPoints(1)} title="Add a point">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
        <Link to={`/spend-points?id=${character.id}`}>
          <Button className="gap-2 w-full sm:w-auto">
            <TreePine className="w-4 h-4" />
            Spend Points
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <StatBlock character={character} skillBonuses={skillBonuses} />
        <AbilityScores character={character} skillBonuses={skillBonuses} />

        <div className="grid gap-4 md:grid-cols-3">
          {['primary', 'secondary', 'tertiary'].map((cat) => (
            <SkillList
              key={cat}
              category={cat}
              skills={categorizedSkills[cat]}
              usedSkills={usedSingleUseSkills}
              onMarkUsed={handleMarkUsed}
            />
          ))}
        </div>
      </div>
      {/* Floating dice roller button */}
      <button
        onClick={() => setShowDiceRoller(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        title="Open Dice Roller"
      >
        <Dices className="w-6 h-6" />
      </button>

      {showDiceRoller && (
        <DiceRollerModal
          onClose={() => setShowDiceRoller(false)}
          character={character}
          onSaveFavorite={handleSaveFavorite}
          onRemoveFavorite={handleRemoveFavorite}
        />
      )}
    </div>
  );
}