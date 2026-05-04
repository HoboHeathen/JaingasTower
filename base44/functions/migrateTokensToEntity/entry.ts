import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-time migration: moves tokens from VttMap.tokens array into standalone VttToken entities.
// Safe to run multiple times — skips maps that already have tokens in VttToken.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const maps = await base44.asServiceRole.entities.VttMap.list();
    let created = 0;
    let skipped = 0;

    for (const map of maps) {
      if (!map.tokens?.length) continue;

      // Check if tokens already migrated for this map
      const existing = await base44.asServiceRole.entities.VttToken.filter({ map_id: map.id });
      if (existing.length > 0) {
        skipped += map.tokens.length;
        continue;
      }

      // Migrate each token
      for (const token of map.tokens) {
        await base44.asServiceRole.entities.VttToken.create({
          map_id: map.id,
          group_id: map.group_id,
          x: token.x ?? 0,
          y: token.y ?? 0,
          name: token.name || 'Token',
          type: token.type || 'neutral',
          size: token.size || 'medium',
          character_id: token.character_id || null,
          monster_id: token.monster_id || null,
          current_hp: token.current_hp ?? null,
          max_hp: token.max_hp ?? null,
          color: token.color || null,
          is_visible: token.is_visible !== false,
        });
        created++;
      }
    }

    return Response.json({ success: true, created, skipped, maps_processed: maps.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});