interface Env {
  UNLOCK_PASSWORD?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    const correctPassword = env.UNLOCK_PASSWORD || 'snowflake2025';

    if (password === correctPassword) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `advent_unlocked=true; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Strict; Secure`,
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
