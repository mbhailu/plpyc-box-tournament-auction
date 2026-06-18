const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default function handler() {
  const key = process.env.PUSHER_KEY;
  const cluster = process.env.PUSHER_CLUSTER || 'ap2';

  if (!key) {
    return new Response(JSON.stringify({ error: 'Pusher not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ key, cluster }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
