import UnlockForm from "@/components/auth/UnlockForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function UnlockPage() {
  return (
    <Card className="bg-card/50 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Unlock Your Vault</CardTitle>
        <CardDescription>
          Enter your master password to decrypt and access your vault.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UnlockForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need to create a vault?{' '}
          <Link href="/register" className="underline text-primary hover:text-accent">
            Register here
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
