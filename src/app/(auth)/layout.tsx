import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="absolute top-8">
            <Logo />
        </div>
        <div className="w-full max-w-md">
            {children}
        </div>
    </main>
  );
}
