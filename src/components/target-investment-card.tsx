"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { updateTargetAction } from "@/app/actions";

/**
 * The total investment target, editable in place — every per-stock target value
 * is a slice of this number, so it needs to be quick to adjust.
 */
export function TargetInvestmentCard({ value }: { value: number }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs tracking-wide text-muted-foreground uppercase">
          Target investment
        </div>

        <form
          ref={formRef}
          action={(formData) =>
            start(async () => {
              await updateTargetAction(formData);
              toast.success("Investment target updated.");
            })
          }
          className="mt-1.5 flex items-center gap-1.5"
        >
          <span className="font-mono text-xl text-muted-foreground sm:text-2xl">
            ₹
          </span>
          <input
            name="totalInvestmentTarget"
            type="number"
            min="0"
            step="1000"
            defaultValue={value}
            disabled={pending}
            aria-label="Total investment target in rupees"
            // Submits on blur as well as Enter, so a phone user who taps away
            // doesn't silently lose the edit.
            onBlur={(e) => {
              if (Number(e.target.value) !== value) formRef.current?.requestSubmit();
            }}
            className="w-full min-w-0 border-b border-transparent bg-transparent font-mono text-xl tabular-nums outline-none hover:border-border focus:border-ring sm:text-2xl"
          />
        </form>

        <div className="mt-1 text-xs text-muted-foreground">
          {pending ? "saving…" : "drives every target value"}
        </div>
      </CardContent>
    </Card>
  );
}
