import React from 'react';
import SkillNode from './SkillNode';

/**
 * Improved tree viewer that groups nodes by tier and draws per-root-branch columns
 * so different root paths don't bleed into each other.
 */
export default function SkillTreeViewer({ tree, unlockedNodeIds, onUnlock, editMode }) {
  const nodes = tree.nodes || [];

  const getNodeStatus = (node) => {
    if (editMode) return 'available';
    if (unlockedNodeIds.includes(node.id)) return 'unlocked';
    const prereqs = node.prerequisites || [];
    if (prereqs.length === 0) return 'available';
    return prereqs.every((pid) => unlockedNodeIds.includes(pid)) ? 'available' : 'locked';
  };

  if (nodes.length === 0) return null;

  // --- Build columns: each root node anchors a column. Non-root nodes go into
  // the column of their first prerequisite's ancestor root.
  const nodeMap = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });

  const rootNodes = nodes.filter((n) => !n.prerequisites || n.prerequisites.length === 0);

  // Assign each node to a root column
  const nodeToRoot = {};
  const assignRoot = (nodeId, rootId) => {
    if (nodeToRoot[nodeId]) return;
    nodeToRoot[nodeId] = rootId;
    // Find nodes that have this node as a prereq
    nodes.forEach((n) => {
      if ((n.prerequisites || []).includes(nodeId)) {
        assignRoot(n.id, rootId);
      }
    });
  };
  rootNodes.forEach((r) => assignRoot(r.id, r.id));
  // Any unassigned nodes (no path to a root) get their own column
  nodes.forEach((n) => {
    if (!nodeToRoot[n.id]) nodeToRoot[n.id] = n.id;
  });

  // Group by root, then by tier within root
  const columns = {}; // rootId -> { tierKey -> node[] }
  nodes.forEach((n) => {
    const rootId = nodeToRoot[n.id];
    if (!columns[rootId]) columns[rootId] = {};
    const tier = n.tier || 0;
    if (!columns[rootId][tier]) columns[rootId][tier] = [];
    columns[rootId][tier].push(n);
  });

  const rootOrder = rootNodes.map((r) => r.id);
  // Also include any orphan roots not in rootNodes
  Object.keys(columns).forEach((rid) => {
    if (!rootOrder.includes(rid)) rootOrder.push(rid);
  });

  return (
    <div className="flex items-start gap-6 overflow-x-auto pb-2">
      {rootOrder.map((rootId) => {
        const tierMap = columns[rootId];
        if (!tierMap) return null;
        const sortedTiers = Object.keys(tierMap).sort((a, b) => Number(a) - Number(b));

        return (
          <div key={rootId} className="flex flex-col items-center gap-0 min-w-[90px]">
            {sortedTiers.map((tierKey, tierIdx) => (
              <React.Fragment key={tierKey}>
                {/* Vertical connector line between tiers */}
                {tierIdx > 0 && (
                  <div className="flex flex-col items-center">
                    <div className={`w-0.5 h-6 transition-colors ${
                      tierMap[tierKey].some((n) => getNodeStatus(n) !== 'locked')
                        ? 'bg-primary/50' : 'bg-border/30'
                    }`} />
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {tierMap[tierKey].map((node) => (
                    <SkillNode
                      key={node.id}
                      node={node}
                      status={getNodeStatus(node)}
                      onUnlock={onUnlock}
                    />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}