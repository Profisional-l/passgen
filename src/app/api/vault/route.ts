import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByLogin, updateVault, setAuthTokenHash } from '@/lib/db';
import { createHash, timingSafeEqual } from 'crypto';

const base64Schema = z.string().min(1).regex(/^[A-Za-z0-9+/]+={0,2}$/);

const updateSchema = z.object({
  login: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  vault_ciphertext: base64Schema,
  vault_nonce: base64Schema,
  vault_version: z.number().int().nonnegative(),
  auth_token: base64Schema,
});

function getProvidedAuthToken(req: NextRequest, fallback?: string | null): string | null {
  return req.headers.get('x-vault-auth') ?? fallback ?? null;
}

function verifyOrBootstrapAuthToken(user: ReturnType<typeof getUserByLogin>, providedAuthToken: string | null, login: string) {
  if (!user || !providedAuthToken) {
    return false;
  }

  const computedHash = createHash('sha256').update(Buffer.from(providedAuthToken, 'base64')).digest();
  const storedHash = user.auth_token_hash;

  if (storedHash) {
    return timingSafeEqual(computedHash, Buffer.from(storedHash));
  }

  // Migration path for older rows: first successful password-derived token becomes the stored verifier.
  setAuthTokenHash(login, computedHash);
  return true;
}

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get('login');
  if (!login) {
    return NextResponse.json({ error: 'Login is required' }, { status: 400 });
  }

  const user = getUserByLogin(login.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const providedAuthToken = getProvidedAuthToken(req);
  if (!verifyOrBootstrapAuthToken(user, providedAuthToken, login.toLowerCase())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    vault_ciphertext: user.vault_ciphertext.toString('base64'),
    vault_nonce: user.vault_nonce.toString('base64'),
    kdf_salt: user.kdf_salt.toString('base64'),
    kdf_params: JSON.parse(user.kdf_params),
    vault_version: user.vault_version,
  });
}

export async function PUT(request: Request) {
  try {
    const req = request as NextRequest;
    const json = await request.json();
    const parsed = updateSchema.parse(json);
    const login = parsed.login.toLowerCase();

    const user = getUserByLogin(login);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const providedAuthToken = getProvidedAuthToken(req, parsed.auth_token);
    if (!verifyOrBootstrapAuthToken(user, providedAuthToken, login)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check version conflict
    if (parsed.vault_version <= user.vault_version) {
      return NextResponse.json(
        { 
          error: 'Conflict', 
          serverVersion: user.vault_version,
          message: 'Your vault is out of sync. Please fetch the latest version and merge your changes.',
        },
        { status: 409 }
      );
    }

    // Update vault
    updateVault(
      login,
      Buffer.from(parsed.vault_ciphertext, 'base64'),
      Buffer.from(parsed.vault_nonce, 'base64'),
      parsed.vault_version
    );

    return NextResponse.json({ 
      vault_version: parsed.vault_version,
      message: 'Vault updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Vault update failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
