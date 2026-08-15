"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshPricesAction } from "@/app/actions";

export function RefreshPricesButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { updated, failed, sources } = await refreshPricesAction();

          // Naming the provider is the only way to tell at a glance whether
          // Upstox is actually serving prices or the Yahoo fallback is.
          const via = sources.length
            ? ` via ${sources.map((s) => (s === "upstox" ? "Upstox" : "Yahoo")).join(" + ")}`
            : "";

          if (failed.length > 0) {
            toast.warning(`Updated ${updated}${via}.`, {
              description: `Could not reach: ${failed.join(", ")}`,
            });
          } else {
            toast.success(`Prices updated for ${updated} holdings${via}.`);
          }
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {/* Label is hidden on narrow screens; the icon carries the meaning. */}
      <span className="sr-only sm:not-sr-only">
        {pending ? "Refreshing…" : "Refresh prices"}
      </span>
    </Button>
  );
}
