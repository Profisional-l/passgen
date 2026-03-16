"use client";

import { useState } from "react";
import type { VaultEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddEditItemDialog from "./AddEditItemDialog";
import { useVault } from "@/context/VaultContext";
import { encryptVault, decryptVault } from "@/lib/crypto";
import { persistEncryptedVault } from "@/lib/storage";
import { mergeVaults } from "@/lib/sync";

export default function VaultItem({ item }: { item: VaultEntry }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const {
    vault,
    setVault,
    masterPassword,
    login,
    kdfParams,
    kdfSalt,
    authToken,
  } = useVault();

  const handleCopy = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${fieldName} copied to clipboard` });
  };

  const handleDelete = async () => {
    if (
      !vault ||
      !masterPassword ||
      !login ||
      !kdfParams ||
      !kdfSalt ||
      !authToken
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot perform action. Vault is locked.",
      });
      return;
    }

    const password = masterPassword;

    try {
      const updatedEntries = vault.entries.filter((i) => i.id !== item.id);
      const updatedVault = {
        ...vault,
        vault_version: vault.vault_version + 1,
        entries: updatedEntries,
      };

      const encrypted = await encryptVault(updatedVault, password, {
        kdf_params: kdfParams,
        kdf_salt: kdfSalt,
      });

      let retryCount = 0;
      const maxRetries = 2;

      const attemptDelete = async (): Promise<boolean> => {
        const response = await fetch("/api/vault", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, ...encrypted, auth_token: authToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409 && retryCount < maxRetries) {
            retryCount++;
            toast({
              title: "🔄 Merging changes...",
              description: `Vault updated on another device. Merging... (attempt ${retryCount}/${maxRetries})`,
            });

            try {
              const getResponse = await fetch(
                `/api/vault?login=${encodeURIComponent(login)}`,
                {
                  headers: {
                    "x-vault-auth": authToken,
                  },
                },
              );
              if (!getResponse.ok)
                throw new Error("Failed to fetch latest vault");

              const serverData = await getResponse.json();

              // Decrypt server version
              const serverVault = await decryptVault(
                {
                  vault_ciphertext: serverData.vault_ciphertext,
                  vault_nonce: serverData.vault_nonce,
                  kdf_salt: serverData.kdf_salt,
                  kdf_params: serverData.kdf_params,
                  vault_version: serverData.vault_version,
                },
                password,
              );

              // Merge locally updated vault with server vault
              const mergedVault = mergeVaults(updatedVault, serverVault);

              // Encrypt merged vault
              const mergedEncrypted = await encryptVault(
                mergedVault,
                password,
                {
                  kdf_params: kdfParams,
                  kdf_salt: kdfSalt,
                },
              );

              // Update reference and retry
              Object.assign(encrypted, mergedEncrypted);
              Object.assign(encrypted, { auth_token: authToken });
              updatedVault.vault_version = mergedVault.vault_version;
              updatedVault.entries = mergedVault.entries;

              return await attemptDelete();
            } catch (syncError) {
              console.error("Merge failed:", syncError);
              toast({
                variant: "destructive",
                title: "Merge Failed",
                description:
                  "Could not merge vault changes. Please refresh and try again.",
              });
              return false;
            }
          }
          throw new Error(errorData.error || "Failed to delete item.");
        }
        return true;
      };

      const success = await attemptDelete();
      // Close dialogs FIRST so Radix can remove pointer-events:none from body
      // before the component unmounts (otherwise UI freezes).
      setIsDeleteConfirm(false);
      setIsDetailOpen(false);
      // Wait for the 200ms close animation to complete, then update state.
      await new Promise((r) => setTimeout(r, 250));
      if (success) {
        await persistEncryptedVault(login, encrypted);
        setVault(updatedVault);
        toast({
          title: "Item Deleted",
          description: `"${item.title}" has been removed from your vault.`,
        });
      } else {
        await persistEncryptedVault(login, encrypted);
        setVault(updatedVault);
        toast({
          title: "Deleted Locally",
          description:
            "No server connection. Deletion stored locally; sync when online.",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          e instanceof Error ? e.message : "An unknown error occurred.",
      });
    }
  };

  const initial = item.title.charAt(0).toUpperCase();
  const safeUrl =
    item.url && /^https?:\/\//i.test(item.url) ? item.url : undefined;

  return (
    <>
      {/* Compact list row */}
      <button
        onClick={() => setIsDetailOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary select-none">
          {initial}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-medium truncate">{item.title}</p>
          {(item.username || safeUrl) && (
            <p className="text-xs text-muted-foreground truncate">
              {item.username || item.url}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Detail dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary select-none">
                {initial}
              </div>
              <DialogTitle className="font-headline text-xl">
                {item.title}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {item.username && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Username / Email
                </p>
                <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
                  <p className="flex-grow font-mono text-sm truncate">
                    {item.username}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => handleCopy(item.username, "Username")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Password
              </p>
              <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
                <p className="flex-grow font-mono text-sm truncate">
                  {showPassword ? item.password : "••••••••••••"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => handleCopy(item.password, "Password")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {item.url && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  URL
                </p>
                <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
                  <p className="flex-grow text-sm text-muted-foreground truncate">
                    {item.url}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => handleCopy(item.url, "URL")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {safeUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      asChild
                    >
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {item.notes && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Notes
                </p>
                <div className="bg-muted/40 rounded-md px-3 py-2">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {item.notes}
                  </p>
                </div>
              </div>
            )}

            {item.tags && item.tags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {isDeleteConfirm ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Delete &ldquo;{item.title}&rdquo;?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Confirm Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDetailOpen(false);
                  setIsEditing(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setIsDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isEditing && (
        <AddEditItemDialog
          itemToEdit={item}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
        />
      )}
    </>
  );
}
