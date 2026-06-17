export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default function handler() {
  return new Response(JSON.stringify({ ok: true, message: 'API is working', time: Date.now() }), {
    status: 200,
    headers: cors,
  });
}
