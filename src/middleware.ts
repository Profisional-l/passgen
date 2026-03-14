import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter.
// Works well for single-process deployments (pm2 single instance, next start).
// For multi-instance / serverless, replace `store` with a Redis-backed adapter.
// ---------------------------------------------------------------------------

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

// Purge stale entries to prevent unbounded memory growth
let lastCleanup = Date.now();
function maybeCleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, e] of store) {
    if (e.resetAt < now) store.delete(key);
  }
}

interface Limit { max: number; windowMs: number }

// Route-specific limits: "METHOD /path" → { max requests per windowMs }
const LIMITS: Record<string, Limit> = {
  'POST /api/register':        { max: 5,   windowMs: 60 * 60 * 1000 }, // 5 / hour
  'PUT /api/vault':            { max: 30,  windowMs: 60 * 1000       }, // 30 / min
  'GET /api/vault':            { max: 60,  windowMs: 60 * 1000       }, // 60 / min
  'GET /api/vault/version':    { max: 120, windowMs: 60 * 1000       }, // 120 / min
};

function getIp(req: NextRequest): string {
  // Trust X-Forwarded-For when behind a reverse proxy (nginx / Vercel)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function check(
  key: string,
  max: number,
  windowMs: number,
  now: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

export function middleware(req: NextRequest) {
  const now = Date.now();
  maybeCleanup(now);

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const routeKey = `${req.method} ${pathname}`;
  const limit = LIMITS[routeKey];
  if (!limit) return NextResponse.next();

  const ip = getIp(req);
  const { allowed, remaining, resetAt } = check(
    `${routeKey}:${ip}`,
    limit.max,
    limit.windowMs,
    now,
  );

  const rlHeaders = {
    'X-RateLimit-Limit':     String(limit.max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          ...rlHeaders,
          'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
        },
      },
    );
  }

  const res = NextResponse.next();
  Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
