"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import VaultItem from "./VaultItem";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { KeyRound, Search, SearchX } from "lucide-react";

export default function VaultList() {
  const { vault } = useVault();
  const [query, setQuery] = useState("");

  if (!vault || vault.entries.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-12 text-center">
          <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium font-headline">
            Your vault is empty
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "Add Item" to save your first password.
          </p>
        </CardContent>
      </Card>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? vault.entries.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.username ?? "").toLowerCase().includes(q) ||
          (item.url ?? "").toLowerCase().includes(q) ||
          (item.notes ?? "").toLowerCase().includes(q),
      )
    : vault.entries;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by name, username, URL or notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center">
            <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium font-headline">
              No results
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No items match «{query}».
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 backdrop-blur-lg border border-border/30">
          <CardContent className="p-2">
            <div className="divide-y divide-border/30">
              {filtered.map((item) => (
                <VaultItem key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
