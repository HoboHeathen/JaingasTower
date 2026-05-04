import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { updates } = await req.json();

        if (!Array.isArray(updates) || updates.length === 0) {
            return Response.json({ error: 'Invalid payload: updates must be a non-empty array' }, { status: 400 });
        }

        for (const u of updates) {
            if (!u.id || typeof u.x !== 'number' || typeof u.y !== 'number') {
                return Response.json({ error: 'Each update must have id, x, and y' }, { status: 400 });
            }
        }

        await Promise.all(
            updates.map(update =>
                base44.asServiceRole.entities.VttToken.update(update.id, { x: update.x, y: update.y })
            )
        );

        return Response.json({ success: true, count: updates.length });
    } catch (error) {
        console.error('Error in updateTokensBatch:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});