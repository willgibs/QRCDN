"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/(app)/api-keys/actions";
import type { ApiKeySummary } from "@/lib/api-keys";

const REVOKE_CONFIRM_TIMEOUT_MS = 4000;
const COPY_FLASH_TIMEOUT_MS = 1600;
const ERROR_TIMEOUT_MS = 6000;

type RevealedKey = { id: string; name: string; fullKey: string; displayPrefix: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** Small quiet cross-link to the public API docs (P7-U5) — the route
 *  doesn't exist yet, but the link resolves the moment that unit lands. */
function DevDocsLink() {
  return (
    <Link
      href="/developers"
      className="w-fit text-sm text-primary underline-offset-4 hover:underline"
    >
      API documentation →
    </Link>
  );
}

/** Labeled state pill — never an unlabeled dot (founder rule, same stance
 *  as codes-table.tsx's StatusPill). "Revoked" reuses the same neutral
 *  muted treatment codes-table.tsx gives "Paused": off, not an error. */
function KeyStatusPill({ revoked }: { revoked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        revoked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      {revoked ? "Revoked" : "Active"}
    </span>
  );
}

/**
 * The one-time full-key reveal. `revealed.fullKey` lives ONLY in
 * `ApiKeysPanel`'s own React state (set once from `createApiKeyAction`'s
 * response, never re-fetched, never written to any storage) — dismissing
 * this card ("Done") clears that state, which unmounts the card and drops
 * the only in-memory reference to the secret. There is no way to bring it
 * back short of revoking the key and minting a new one.
 *
 * No entrance animation (work surfaces render settled, design-system.md) —
 * the copy-confirmation icon swap below is an instant state toggle, no
 * motion needed.
 */
function RevealOnceCard({ revealed, onDismiss }: { revealed: RevealedKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(revealed.fullKey);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), COPY_FLASH_TIMEOUT_MS);
    } catch {
      // Clipboard access denied/unavailable — the key is still visible and
      // selectable by hand; no error UI for a nice-to-have.
    }
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {revealed.name}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground select-all">
            {revealed.fullKey}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? "Copied" : "Copy key"}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3.5 text-(--ok)" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            This is the only time you&rsquo;ll see this key. Store it now.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * `/api-keys`' client panel (P7-U4) — the Pro-plan create/manage surface
 * only. Every prop is server-fetched in app/(app)/api-keys/page.tsx and
 * passed straight in — the only client-side fetching this component does is
 * the two server actions it calls on create/revoke. `keys` is lifted into
 * local state (mirrors kit-bar.tsx's own pattern) so a create/revoke updates
 * the list optimistically from the action's own response instead of a full
 * page refetch.
 *
 * P9.5-T7: page.tsx now renders this component only when `plan === "pro"`
 * (the free-plan branch renders `ApiKeysFreeShowcase` instead), so there is
 * no `plan` prop here anymore — every caller of this component already
 * knows the answer before reaching it.
 */
export function ApiKeysPanel({
  keys: initialKeys,
  usageByKeyId,
}: {
  keys: ApiKeySummary[];
  usageByKeyId: Record<string, number>;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [draftName, setDraftName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revokeBusyId, setRevokeBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (revokeTimer.current) clearTimeout(revokeTimer.current);
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  function showError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_TIMEOUT_MS);
  }

  // Every handler wraps its server-action call in try/finally — the action
  // itself never throws (it returns an ActionResult), but the invocation
  // can still reject at the network/framework layer, and without the
  // finally the busy flag would stay set forever (same P4-U4 red-team
  // reasoning kit-bar.tsx documents on its own handlers).
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = draftName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKeyAction(name);
      if (!result.ok) {
        showError(
          result.error === "pro_required"
            ? "API keys are a Pro feature."
            : "Couldn't create that key. Try again.",
        );
        return;
      }
      setKeys((prev) => [
        {
          id: result.data.id,
          name: result.data.name,
          key_prefix: result.data.displayPrefix,
          created_at: new Date().toISOString(),
          last_used_at: null,
          revoked_at: null,
        },
        ...prev,
      ]);
      setRevealed(result.data);
      setDraftName("");
    } catch {
      showError("Couldn't create that key. Try again.");
    } finally {
      setCreating(false);
    }
  }

  function armRevoke(id: string) {
    setConfirmRevokeId(id);
    if (revokeTimer.current) clearTimeout(revokeTimer.current);
    revokeTimer.current = setTimeout(() => setConfirmRevokeId(null), REVOKE_CONFIRM_TIMEOUT_MS);
  }

  async function handleRevoke(id: string) {
    if (confirmRevokeId !== id) {
      armRevoke(id);
      return;
    }
    if (revokeTimer.current) clearTimeout(revokeTimer.current);
    setConfirmRevokeId(null);
    setRevokeBusyId(id);
    try {
      const result = await revokeApiKeyAction(id);
      if (!result.ok) {
        showError("Couldn't revoke that key. Try again.");
        return;
      }
      const revokedAt = new Date().toISOString();
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: revokedAt } : k)));
    } catch {
      showError("Couldn't revoke that key. Try again.");
    } finally {
      setRevokeBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {revealed ? (
        <RevealOnceCard revealed={revealed} onDismiss={() => setRevealed(null)} />
      ) : (
        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Key name"
            aria-label="New API key name"
            maxLength={80}
            disabled={creating}
            className="h-8 w-56"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={creating || draftName.trim().length === 0}
            className="gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
          >
            {creating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
            Create key
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <DevDocsLink />

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No API keys yet. Mint one above to start calling the API.
        </p>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>This month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sr-only">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => {
                  const revoked = key.revoked_at !== null;
                  const usage = usageByKeyId[key.id] ?? 0;
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {key.key_prefix}…
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(key.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {usage.toLocaleString()} requests this month
                      </TableCell>
                      <TableCell>
                        <KeyStatusPill revoked={revoked} />
                      </TableCell>
                      <TableCell className="text-right">
                        {!revoked && (
                          <Button
                            type="button"
                            variant={confirmRevokeId === key.id ? "destructive" : "ghost"}
                            size="sm"
                            disabled={revokeBusyId === key.id}
                            onClick={() => handleRevoke(key.id)}
                          >
                            {revokeBusyId === key.id ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : confirmRevokeId === key.id ? (
                              "Confirm revoke"
                            ) : (
                              "Revoke"
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
