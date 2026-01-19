import BackupManager from "@/components/settings/BackupManager";

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-headline">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your vault data.
                </p>
            </div>
            
            <BackupManager />
        </div>
    );
}
