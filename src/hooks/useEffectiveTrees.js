/**
 * Returns the "effective" skill trees for the current user:
 * - If user has a UserSkillTree for a given source_tree_id, use that
 * - Otherwise fall back to the default SkillTree
 * Also exposes helpers to fork a tree and reset it.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useEffectiveTrees() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: defaultTrees = [], isLoading: loadingDefaults } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list('sort_order'),
  });

  const { data: userTrees = [], isLoading: loadingUser } = useQuery({
    queryKey: ['user-skill-trees', user?.email],
    queryFn: () => base44.entities.UserSkillTree.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  // Map: source_tree_id -> UserSkillTree
  const userTreeMap = Object.fromEntries(userTrees.map((t) => [t.source_tree_id, t]));

  // Effective trees: use user copy if it exists, else default
  const effectiveTrees = defaultTrees.map((def) => {
    const copy = userTreeMap[def.id];
    if (!copy) return { ...def, _isUserCopy: false };
    // Check if the user copy is identical to the default (i.e. was just reset)
    const nodesMatch = JSON.stringify(copy.nodes) === JSON.stringify(def.nodes);
    return { ...copy, _isUserCopy: true, _isResetToDefault: nodesMatch, _defaultTree: def };
  });

  const forkMutation = useMutation({
    mutationFn: (defaultTree) =>
      base44.entities.UserSkillTree.create({
        owner_email: user.email,
        source_tree_id: defaultTree.id,
        name: defaultTree.name,
        description: defaultTree.description,
        tree_category: defaultTree.tree_category,
        sort_order: defaultTree.sort_order,
        nodes: defaultTree.nodes || [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skill-trees', user?.email] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ userTreeId, defaultTree }) =>
      base44.entities.UserSkillTree.update(userTreeId, {
        name: defaultTree.name,
        description: defaultTree.description,
        tree_category: defaultTree.tree_category,
        sort_order: defaultTree.sort_order,
        nodes: defaultTree.nodes || [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skill-trees', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
    },
  });

  /**
   * Ensures the user has a copy for a given default tree, forking if needed.
   * Returns the UserSkillTree record.
   */
  const ensureUserCopy = async (defaultTree) => {
    const existing = userTreeMap[defaultTree.id];
    if (existing) return existing;
    return forkMutation.mutateAsync(defaultTree);
  };

  return {
    defaultTrees,
    userTrees,
    userTreeMap,
    effectiveTrees,
    isLoading: loadingDefaults || loadingUser,
    forkMutation,
    resetMutation,
    ensureUserCopy,
    user,
  };
}