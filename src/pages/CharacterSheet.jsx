import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TreePine, Plus, Minus, Dices, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatBlock from '@/components/character/StatBlock';
import AbilityScores from '@/components/character/AbilityScores';
import SkillList from '@/components/character/SkillList';
import DiceRollerModal from '@/components/dice/DiceRollerModal';
import ChargeDicePool from '@/components/character/ChargeDicePool';
import InventoryActionsBlock from '@/components/character/InventoryActionsBlock';

const LAST_CHAR_KEY = 'lastViewedCharacterId';

export default function CharacterSheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');

  // Save last viewed character id
  React.useEffect(() => {
    if (characterId) localStorage.setItem(LAST_CHAR_KEY, characterId);
  }, [characterId]);
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

  const { data: racialTrees = [] } = useQuery({
    queryKey: ['racial-trees'],
    queryFn: () => base44.entities.RacialTree.list(),
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

  const racialTreeMap = {};
  racialTrees.forEach((t) => { racialTreeMap[t.id] = t; });

  const skillBonuses = { health: 0, armor: 0, speed: 0, spell_range: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const categorizedSkills = { primary: [], secondary: [], tertiary: [], reactionary: [] };
  const categorizedAugments = { primary: [], secondary: [], tertiary: [], reactionary: [] };

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

    if (node.node_type === 'stat_increase') return;

    // Augments go into their own bucket
    if (node.node_type === 'augment') {
      const cat = node.category || 'primary';
      if (categorizedAugments[cat] !== undefined) {
        categorizedAugments[cat].push({ ...node, treeId: tree.id, treeName: tree.name, treeCategory: tree.tree_category });
      }
      return;
    }

    const isReactionary =
      node.category === 'reactionary' ||
      (node.description && /as a reactionary action/i.test(node.description));

    const cat = isReactionary ? 'reactionary' : (node.category || 'primary');
    if (categorizedSkills[cat] !== undefined) {
      categorizedSkills[cat].push({ ...node, treeId: tree.id, treeName: tree.name, treeCategory: tree.tree_category });
    }
  });

  // Inject unlocked (invested) racial skills into action buckets
  const unlockedRacialSkills = character.unlocked_racial_skills || [];
  unlockedRacialSkills.forEach(({ racial_tree_id, node_id }) => {
    const tree = racialTreeMap[racial_tree_id];
    if (!tree) return;
    const node = (tree.nodes || []).find((n) => n.id === node_id);
    if (!node) return;
    const cat = node.category;
    if (cat === 'passive' || !categorizedSkills[cat]) return;
    categorizedSkills[cat].push({ ...node, treeId: tree.id, treeName: tree.tree_name, treeCategory: 'racial' });
  });

  const handleCharge = () => {
    const current = character.charge_pool_current ?? 0;
    const limit = character.charge_pool_limit ?? 0;
    if (current >= limit) return;
    updateMutation.mutate({ charge_pool_current: current + 1 });
  };

  const handleDeplete = () => {
    updateMutation.mutate({ charge_pool_current: 0 });
  };

  const handleMarkUsed = (nodeId) => {
    const updated = [...usedSingleUseSkills];
    if (!updated.includes(nodeId)) updated.push(nodeId);
    updateMutation.mutate({ used_single_use_skills: updated });
  };

  const handleAdjustPoints = (delta) => {
    const newTotal = Math.max(0, totalPoints + delta);
    updateMutation.mutate({ total_points: newTotal });
  };

  const handleUpdateCharacter = (data) => {
    updateMutation.mutate(data);
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

  const handleShareRoll = (rollContent) => {
    if (!character.group_id || !character.share_rolls) return;
    base44.entities.GroupMessage.create({
      group_id: character.group_id,
      sender_email: character.created_by || '',
      sender_name: character.name,
      content: rollContent,
      message_type: 'roll',
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { localStorage.removeItem(LAST_CHAR_KEY); window.location.href = '/'; }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{character.name}</h1>
            {character.race_selections?.length > 0 && (
              <p className="text-xs italic text-muted-foreground leading-tight">
                {character.race_selections.map((r) => r.race_name).filter(Boolean).join(' / ')}
              </p>
            )}
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
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {character.group_id && (
            <button
              onClick={() => updateMutation.mutate({ share_rolls: !character.share_rolls })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                character.share_rolls
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-secondary/50 text-muted-foreground border-border/40 hover:border-border'
              }`}
              title="Share your dice rolls to the group rolls tab"
            >
              <Dices className="w-3.5 h-3.5" />
              {character.share_rolls ? 'Sharing Rolls' : 'Share Rolls'}
            </button>
          )}
          <Link to={`/inventory?id=${character.id}`}>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Package className="w-4 h-4" />
              Inventory
            </Button>
          </Link>
          <Link to={`/spend-points?id=${character.id}`}>
            <Button className="gap-2 w-full sm:w-auto">
              <TreePine className="w-4 h-4" />
              Spend Points
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <StatBlock character={character} skillBonuses={skillBonuses} />
        <AbilityScores character={character} skillBonuses={skillBonuses} onShareRoll={character.group_id ? handleShareRoll : null} />

        {(() => {
          const magicDice = {
            fire: character.fire_dice_index ?? 0,
            frost: character.frost_dice_index ?? 0,
            lightning: character.lightning_dice_index ?? 0,
            necrotic: character.necrotic_dice_index ?? 0,
            healing: character.healing_dice_index ?? 0,
          };
          return (
            <>
              <ChargeDicePool
                current={character.charge_pool_current ?? 0}
                limit={character.charge_pool_limit ?? 0}
                onCharge={handleCharge}
                onDeplete={handleDeplete}
              />

              <div className="grid gap-4 md:grid-cols-3">
                {['primary', 'secondary', 'tertiary'].map((cat) => (
                  <SkillList
                    key={cat}
                    category={cat}
                    skills={categorizedSkills[cat]}
                    augmentSkills={categorizedAugments[cat]}
                    usedSkills={usedSingleUseSkills}
                    onMarkUsed={handleMarkUsed}
                    magicDice={magicDice}
                    chargePool={character.charge_pool_current ?? 0}
                    chargeLimit={character.charge_pool_limit ?? 0}
                    onCharge={handleCharge}
                    onDeplete={handleDeplete}
                    onShareRoll={character.group_id ? handleShareRoll : null}
                  />
                ))}
              </div>

              {categorizedSkills.reactionary.length > 0 && (
                <SkillList
                  category="reactionary"
                  skills={categorizedSkills.reactionary}
                  usedSkills={usedSingleUseSkills}
                  onMarkUsed={handleMarkUsed}
                  magicDice={magicDice}
                  chargePool={character.charge_pool_current ?? 0}
                  chargeLimit={character.charge_pool_limit ?? 0}
                  onCharge={handleCharge}
                  onDeplete={handleDeplete}
                  onShareRoll={character.group_id ? handleShareRoll : null}
                />
              )}

              <InventoryActionsBlock characterId={characterId} />
            </>
          );
        })()}
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
          onShareRoll={character.group_id ? handleShareRoll : null}
        />
      )}
    </div>
  );
}