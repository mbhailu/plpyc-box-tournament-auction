const KV_KEY = 'auction:live';

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV not configured');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
  });
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await kvGet(KV_KEY);
      return res.status(200).json(data ?? null);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !body.teams || !body.teams.length) {
        return res.status(400).json({ error: 'Invalid auction data' });
      }
      body.timestamp = Date.now();
      body.id = 'main';
      await kvSet(KV_KEY, body);
      return res.status(200).json({ ok: true, timestamp: body.timestamp });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auction API error:', err);
    const msg = String(err.message || err);
    if (msg.includes('KV not configured')) {
      return res.status(503).json({ error: 'Vercel KV not connected — add KV in project Storage settings' });
    }
    return res.status(500).json({ error: msg });
  }
};
