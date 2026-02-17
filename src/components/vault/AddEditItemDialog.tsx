"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/context/VaultContext";
import { encryptVault, decryptVault } from "@/lib/crypto";
import type { VaultEntry } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { persistEncryptedVault } from "@/lib/storage";
import { mergeVaults } from "@/lib/sync";

// `uuid` is not in package.json, so we'll use a simple random generator
const simpleUUID = () => crypto.randomUUID();

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
  url: z.string().url("Please enter a valid URL.").or(z.literal("")),
  notes: z.string().optional(),
});

type AddEditItemDialogProps = {
  itemToEdit?: VaultEntry;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddEditItemDialog({
  itemToEdit,
  isOpen,
  onOpenChange,
}: AddEditItemDialogProps) {
  const { toast } = useToast();
  const { vault, setVault, masterPassword, login, kdfParams, kdfSalt } =
    useVault();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!itemToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (itemToEdit) {
      form.reset(itemToEdit);
    } else {
      form.reset({ title: "", username: "", password: "", url: "", notes: "" });
    }
  }, [itemToEdit, form, isOpen]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!vault || !masterPassword || !login || !kdfParams || !kdfSalt) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Vault is not loaded or session has expired.",
      });
      return;
    }
    setIsLoading(true);

    const password = masterPassword;

    try {
      let updatedItems: VaultEntry[];
      if (isEditing) {
        updatedItems = vault.entries.map((item) =>
          item.id === itemToEdit.id
            ? { ...item, ...values, updatedAt: new Date().toISOString() }
            : item,
        );
      } else {
        const now = new Date().toISOString();
        updatedItems = [
          ...vault.entries,
          {
            id: simpleUUID(),
            ...values,
            tags: [],
            createdAt: now,
            updatedAt: now,
          },
        ];
      }

      const updatedVault = {
        ...vault,
        vault_version: vault.vault_version + 1,
        entries: updatedItems,
      };

      const encrypted = await encryptVault(updatedVault, password, {
        kdf_params: kdfParams,
        kdf_salt: kdfSalt,
      });

      let retryCount = 0;
      const maxRetries = 2;

      const attemptSave = async (): Promise<boolean> => {
        const response = await fetch("/api/vault", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, ...encrypted }),
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
              // 1. Fetch latest server version
              const getResponse = await fetch(
                `/api/vault?login=${encodeURIComponent(login)}`,
              );
              if (!getResponse.ok)
                throw new Error("Failed to fetch latest vault");

              const serverData = await getResponse.json();

              // 2. Decrypt server version
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

              // 3. Merge locally updated vault with server vault
              const mergedVault = mergeVaults(updatedVault, serverVault);

              // 4. Encrypt merged vault
              const mergedEncrypted = await encryptVault(mergedVault, password, {
                kdf_params: kdfParams,
                kdf_salt: kdfSalt,
              });

              // Update reference and retry
              Object.assign(encrypted, mergedEncrypted);
              updatedVault.vault_version = mergedVault.vault_version;
              updatedVault.entries = mergedVault.entries;

              return await attemptSave();
            } catch (syncError) {
              console.error("Merge failed:", syncError);
              toast({
                variant: "destructive",
                title: "Sync Failed",
                description:
                  "Could not merge vault changes. Please refresh and try again.",
              });
              return false;
            }
          }
          throw new Error(errorData.error || "Failed to save item.");
        }
        return true;
      };

      try {
        const success = await attemptSave();
        if (success) {
          await persistEncryptedVault(login, encrypted);
          setVault(updatedVault);
          toast({
            title: "Success!",
            description: `Item has been ${isEditing ? "updated" : "added"}.`,
          });
          onOpenChange(false);
        }
      } catch (networkError) {
        // Offline-first: persist locally and notify the user to sync later
        await persistEncryptedVault(login, encrypted);
        setVault(updatedVault);
        toast({
          title: "Saved Locally",
          description:
            "No server connection. Your change is stored locally and will need a manual sync.",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditing ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Make changes to "${itemToEdit.title}".`
              : "Enter the details for the new vault item."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Google Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username/Email</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
