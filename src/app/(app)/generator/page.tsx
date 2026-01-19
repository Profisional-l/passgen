import PasswordGenerator from "@/components/password/PasswordGenerator";

export default function GeneratorPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline">Password Generator</h1>
                    <p className="text-muted-foreground">
                        Create strong, random passwords.
                    </p>
                </div>
            </div>

            <PasswordGenerator />
        </div>
    );
}
