"use client";

import { useState } from "react";
import type { VaultEntry } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Eye, EyeOff, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddEditItemDialog from "./AddEditItemDialog";
import { useVault } from "@/context/VaultContext";
import { encryptVault } from "@/lib/crypto";
import { persistEncryptedVault } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function VaultItem({ item }: { item: VaultEntry }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { vault, setVault, masterPassword, login, kdfParams, kdfSalt } =
    useVault();

  const handleCopy = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${fieldName} copied to clipboard` });
  };

  const handleDelete = async () => {
    if (!vault || !masterPassword || !login || !kdfParams || !kdfSalt) {
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
      const maxRetries = 3;
      
      const attemptDelete = async (): Promise<boolean> => {
        const response = await fetch("/api/vault", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, ...encrypted }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409 && retryCount < maxRetries) {
            // Conflict: fetch latest version and retry
            retryCount++;
            toast({ 
              title: 'Syncing...', 
              description: `Vault version conflict. Syncing with server (attempt ${retryCount}/${maxRetries})...` 
            });
            
            try {
              const getResponse = await fetch(`/api/vault?login=${encodeURIComponent(login)}`);
              if (!getResponse.ok) throw new Error('Failed to fetch latest vault');
              
              const serverData = await getResponse.json();
              // Update local version to match server and retry
              updatedVault.vault_version = serverData.vault_version + 1;
              const newEncrypted = await encryptVault(updatedVault, password, { kdf_params: kdfParams, kdf_salt: kdfSalt });
              
              // Re-assign encrypted for the next attempt
              Object.assign(encrypted, newEncrypted);
              
              return await attemptDelete();
            } catch (syncError) {
              toast({ variant: 'destructive', title: 'Sync Failed', description: 'Could not resolve vault conflict. Please refresh and try again.' });
              return false;
            }
          }
          throw new Error(errorData.error || "Failed to delete item.");
        }
        return true;
      };

      const success = await attemptDelete();
      if (success) {
        await persistEncryptedVault(login, encrypted);
        setVault(updatedVault);
        toast({
          title: "Item Deleted",
          description: `"${item.title}" has been removed from your vault.`,
        });
      } catch (networkError) {
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
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-lg border border-border/30 flex flex-col">
        <CardHeader className="flex-row items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="font-headline">{item.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <AlertDialog onOpenChange={setIsDeleting} open={isDeleting}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">Delete</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{item.title}". This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          <div className="flex items-center gap-2">
            <p className="flex-grow font-mono text-sm">{item.username}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(item.username, "Username")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-grow font-mono text-sm">
              {showPassword ? item.password : "••••••••••••••••"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(item.password, "Password")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {item.url && (
            <div className="flex items-center gap-2">
              <p className="flex-grow text-sm text-muted-foreground truncate">
                {item.url}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(item.url, "URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
