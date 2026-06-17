export const config = { runtime: 'edge' };

const KV_KEY = 'auction:live';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const data = await kvGet(KV_KEY);
      return jsonResponse(data ?? null);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body || !body.teams || !body.teams.length) {
        return jsonResponse({ error: 'Invalid auction data' }, 400);
      }
      body.timestamp = Date.now();
      body.id = 'main';
      await kvSet(KV_KEY, body);
      return jsonResponse({ ok: true, timestamp: body.timestamp });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes('KV not configured')) {
      return jsonResponse({ error: 'Vercel KV not connected — add KV in Storage settings' }, 503);
    }
    return jsonResponse({ error: msg }, 500);
  }
}
