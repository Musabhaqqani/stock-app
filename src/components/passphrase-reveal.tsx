"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a freshly generated passphrase once. It is bcrypt-hashed on the way
 * into the database and cannot be read back, so this is the only chance to
 * copy it — the copy affordance is the point of the component.
 */
export function PassphraseReveal({
  name,
  passphrase,
}: {
  name: string;
  passphrase: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border border-under/40 bg-under/10 p-3">
      <div className="flex items-center gap-2 text-sm text-under">
        <KeyRound className="size-4 shrink-0" />
        <span className="font-medium">Credentials for {name}</span>
      </div>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded bg-background px-2.5 py-1.5 font-mono text-sm whitespace-nowrap">
          {passphrase}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copy passphrase"
          className="size-8 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(passphrase);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>

      <p className="text-xs text-under/80">
        Copy this now — it is hashed in the database and cannot be shown again.
      </p>
    </div>
  );
}
