import React from 'react';
import SkillNode from './SkillNode';
import TreeConnector from './TreeConnector';

export default function SkillTreeViewer({ tree, unlockedNodeIds, onUnlock }) {
  const nodes = tree.nodes || [];

  // Group nodes by tier
  const tiers = {};
  nodes.forEach((node) => {
    const tier = node.tier || 0;
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(node);
  });

  const sortedTierKeys = Object.keys(tiers).sort((a, b) => Number(a) - Number(b));

  const getNodeStatus = (node) => {
    if (unlockedNodeIds.includes(node.id)) return 'unlocked';
    const prereqs = node.prerequisites || [];
    if (prereqs.length === 0) return 'available';
    const allPrereqsMet = prereqs.every((pid) => unlockedNodeIds.includes(pid));
    return allPrereqsMet ? 'available' : 'locked';
  };

  return (
    <div className="flex flex-col items-center gap-0">
      {sortedTierKeys.map((tierKey, tierIdx) => (
        <React.Fragment key={tierKey}>
          {tierIdx > 0 && (
            <TreeConnector
              isActive={tiers[tierKey].some(
                (n) => getNodeStatus(n) === 'unlocked' || getNodeStatus(n) === 'available'
              )}
            />
          )}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {tiers[tierKey].map((node) => (
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
}