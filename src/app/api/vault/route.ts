import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByLogin, updateVault } from '@/lib/db';

const updateSchema = z.object({
  login: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  vault_ciphertext: z.string().min(1),
  vault_nonce: z.string().min(1),
  vault_version: z.number().int().nonnegative(),
});

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get('login');
  if (!login) {
    return NextResponse.json({ error: 'Login is required' }, { status: 400 });
  }

  const user = getUserByLogin(login.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    const json = await request.json();
    const parsed = updateSchema.parse(json);
    const login = parsed.login.toLowerCase();

    const user = getUserByLogin(login);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
