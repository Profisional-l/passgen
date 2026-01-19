import { NextResponse } from 'next/server';

// This is an in-memory "database" to simulate a real backend.
// In a real application, this would be a persistent database.
let vaultStore: {
  ciphertext: string;
  nonce: string;
  salt: string;
  params: any;
  version: number;
} | null = null;

export async function GET() {
  if (!vaultStore) {
    return NextResponse.json({ error: 'No vault found. Please register first.' }, { status: 404 });
  }
  return NextResponse.json(vaultStore);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ciphertext, nonce, salt, params, version } = body;

    if (!ciphertext || !nonce || !salt || !params || version === undefined) {
      return NextResponse.json({ error: 'Missing required vault data' }, { status: 400 });
    }

    // On initial save (registration), vaultStore is null
    if (vaultStore === null) {
        vaultStore = { ...body, version: 1 };
        return NextResponse.json({ message: 'Vault created successfully', version: vaultStore.version });
    }

    // Conflict resolution: The incoming version must match the stored version.
    if (version !== vaultStore.version) {
      return NextResponse.json(
        {
          error: 'Conflict: The vault has been updated elsewhere. Please unlock again to get the latest version.',
          serverVersion: vaultStore.version,
        },
        { status: 409 }
      );
    }
    
    // Update the vault and increment the version
    vaultStore = { ...body, version: vaultStore.version + 1 };

    return NextResponse.json({ message: 'Vault updated successfully', version: vaultStore.version });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
