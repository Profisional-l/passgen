import { NextRequest, NextResponse } from 'next/server';
import { getUserByLogin } from '@/lib/db';

/**
 * GET /api/vault/version?login=...
 * Lightweight endpoint to check vault version without decryption
 * Used for sync detection
 */
export async function GET(req: NextRequest) {
  try {
    const login = req.nextUrl.searchParams.get('login');
    if (!login) {
      return NextResponse.json({ error: 'Login is required' }, { status: 400 });
    }

    const user = getUserByLogin(login.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      vault_version: user.vault_version,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error('Version check failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
