import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertUser, getUserByLogin } from '@/lib/db';
import { randomUUID } from 'crypto';

const registerSchema = z.object({
  login: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, 'Login may contain letters, digits, dot, underscore, dash'),
  vault_ciphertext: z.string().min(1),
  vault_nonce: z.string().min(1),
  kdf_salt: z.string().min(1),
  kdf_params: z.object({
    algorithm: z.enum(['argon2id', 'pbkdf2']),
    memory: z.number().optional(),
    iterations: z.number().positive(),
    parallelism: z.number().optional(),
    hash: z.literal('SHA-256'),
  }),
  vault_version: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerSchema.parse(json);

    const login = parsed.login.toLowerCase();
    const existing = getUserByLogin(login);
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    insertUser({
      id: randomUUID(),
      login,
      vault_ciphertext: Buffer.from(parsed.vault_ciphertext, 'base64'),
      vault_nonce: Buffer.from(parsed.vault_nonce, 'base64'),
      kdf_salt: Buffer.from(parsed.kdf_salt, 'base64'),
      kdf_params: JSON.stringify(parsed.kdf_params),
      vault_version: parsed.vault_version,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Register error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

