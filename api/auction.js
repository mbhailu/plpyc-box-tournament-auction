export const config = { runtime: 'nodejs' };

import Pusher from 'pusher';

const KV_KEY = 'auction:live';
const PUSHER_CHANNEL = 'auction-live';
const PUSHER_EVENT = 'state-update';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const pusher =
  process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER || 'ap2',
        useTLS: true,
      })
    : null;

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

async function broadcastUpdate(timestamp) {
  if (!pusher) return;
  try {
    await pusher.trigger(PUSHER_CHANNEL, PUSHER_EVENT, { timestamp });
  } catch (err) {
    console.error('Pusher broadcast failed:', err);
  }
}

function jsonResponse(body, status = 200) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  return res.status(status).json(body);
}

export default async function handler(req, res) {
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
      await broadcastUpdate(body.timestamp);
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
