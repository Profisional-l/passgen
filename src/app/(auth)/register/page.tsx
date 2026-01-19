import RegisterForm from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <Card className="bg-card/50 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Your Secure Vault</CardTitle>
        <CardDescription>
          Choose a strong, unique master password. This is the only key to your vault and is never sent to our servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
         <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have a vault?{' '}
          <Link href="/unlock" className="underline text-primary hover:text-accent">
            Unlock it here
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
