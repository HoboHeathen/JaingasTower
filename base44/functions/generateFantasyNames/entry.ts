import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { quantity = 1 } = await req.json();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate ${quantity} unique common townfolk names for an RPG game. These should sound like ordinary people — innkeepers, farmers, merchants, guards, craftspeople. Mix male and female names. Names should be grounded and realistic-sounding, not overly fantastical. Return only a JSON object with a "names" array of strings.`,
      response_json_schema: {
        type: 'object',
        properties: {
          names: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json({ names: result.names || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});