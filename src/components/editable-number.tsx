"use client";

import { useRef, useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateStockAction } from "@/app/actions";

/**
 * One inline-editable numeric field on a holding.
 *
 * Each field is its own form submitting a single key, which is why
 * `updateStockAction` only applies the fields present in the FormData — editing
 * price must not clobber a share count someone changed a moment earlier.
 *
 * Submits on blur as well as Enter: on a phone there is no Enter key in the
 * numeric keypad, so blur is the only reliable commit.
 */
export function EditableNumber({
  id,
  field,
  value,
  step = "1",
  label,
  className,
  prefix,
  align = "right",
}: {
  id: string;
  field: "price" | "shares" | "targetPct";
  value: number;
  step?: string;
  label: string;
  className?: string;
  prefix?: string;
  /** Right for table columns; left for stacked card fields, where a
   *  right-aligned value drifts away from the label above it. */
  align?: "left" | "right";
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => start(() => updateStockAction(formData))}
      className={cn(
        "flex items-center gap-0.5",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      <input type="hidden" name="id" value={id} />
      {prefix && (
        <span className="shrink-0 text-muted-foreground">{prefix}</span>
      )}
      <input
        name={field}
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        defaultValue={value}
        aria-label={label}
        disabled={pending}
        onBlur={(e) => {
          if (Number(e.target.value) !== value) formRef.current?.requestSubmit();
        }}
        className={cn(
          "min-w-0 border-b border-transparent bg-transparent font-mono tabular-nums outline-none hover:border-border focus:border-ring",
          align === "right" ? "text-right" : "text-left",
          pending && "opacity-50",
          className,
        )}
      />
    </form>
  );
}
