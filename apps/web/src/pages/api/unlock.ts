import type { APIRoute } from 'astro';

const UNLOCK_PASSWORD = import.meta.env.UNLOCK_PASSWORD || 'snowflake2025';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    if (password === UNLOCK_PASSWORD) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `advent_unlocked=true; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Strict`,
        },
      });
    }

    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
