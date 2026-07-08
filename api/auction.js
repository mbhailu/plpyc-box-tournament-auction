export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await kvGet(KV_KEY);
      return jsonResponse(res, data ?? null);
    }

    if (req.method === 'POST') {
      const body = req.body; // <-- changed

      if (!body || !body.teams || !body.teams.length) {
        return jsonResponse(res, { error: 'Invalid auction data' }, 400);
      }

      body.timestamp = Date.now();
      body.id = 'main';

      await kvSet(KV_KEY, body);
      await broadcastUpdate(body.timestamp);

      return jsonResponse(res, {
        ok: true,
        timestamp: body.timestamp,
      });
    }

    return jsonResponse(res, { error: 'Method not allowed' }, 405);
  } catch (err) {
    const msg = String(err.message || err);

    if (msg.includes('KV not configured')) {
      return jsonResponse(
        res,
        {
          error: 'Vercel KV not connected — add KV in Storage settings',
        },
        503
      );
    }

    return jsonResponse(res, { error: msg }, 500);
  }
}
