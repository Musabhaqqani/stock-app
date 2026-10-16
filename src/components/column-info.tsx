"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Explanations for the holdings columns.
 *
 * Several of these numbers are only obvious once you know which total they are
 * measured against — `gap` and `toBuy` in particular use *different*
 * denominators, which is why they can disagree in sign. Rather than a footnote
 * nobody reads, each column head opens its own definition.
 */
export const COLUMN_INFO = {
  price: {
    title: "Price",
    what: "The latest share price in rupees.",
    how: "Fetched live from the NSE feed, roughly every 15 minutes. A label under the value shows its age when it is more than an hour old. You can type over it to set a price by hand.",
  },
  shares: {
    title: "Shares",
    what: "How many whole shares of this stock you currently own.",
    how: "You enter this yourself — the app has no brokerage connection. Editing it recalculates every other column on this row.",
  },
  buyPrice: {
    title: "Bought at",
    what: "The average price you paid per share.",
    formula: "(old shares × old avg + new shares × new price) ÷ total shares",
    how: "Use the ⇄ button on a holding each time you buy or sell — buying re-averages this, selling leaves it unchanged. You can also type it directly. Leave it at 0 if you don't want profit/loss tracked for this stock. It only affects profit/loss — weights and targets use today's price.",
  },
  value: {
    title: "Value",
    what: "What your holding in this stock is worth right now.",
    formula: "price × shares",
    note: "When a buy price is set, the line below shows profit/loss: value − (bought at × shares).",
  },
  now: {
    title: "Now",
    what: "This stock's share of your portfolio as it stands today.",
    formula: "value ÷ total value of all holdings × 100",
    note: "Measured against what you have actually invested so far — not against your target investment.",
  },
  target: {
    title: "Target",
    what: "The share of the portfolio you want this stock to eventually hold.",
    how: "Yours to set. These do not have to add up to 100%, but the dashboard warns you when they don't, because target values then won't sum to your investment target.",
  },
  gap: {
    title: "Gap",
    what: "How far this stock's current weight sits from the weight you want.",
    formula: "target % − now %",
    note: "Positive (amber) means underweight — it is a smaller slice than you want. Negative (red) means overweight. Because this compares against today's portfolio value, a stock can read overweight while still needing shares to reach its target value.",
  },
  toBuy: {
    title: "To buy",
    what: "How many more shares would bring this holding up to its target value.",
    formula: "round((target % × total investment target) ÷ price) − shares",
    note: "Measured against your total investment target, not today's portfolio value — which is why this can be positive even when the gap is negative. It never goes below zero: the app does not suggest selling.",
  },
} as const;

export type ColumnKey = keyof typeof COLUMN_INFO;

export function ColumnInfo({
  column,
  className,
  align = "end",
}: {
  column: ColumnKey;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const info = COLUMN_INFO[column];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`What does "${info.title}" mean?`}
            className={cn(
              "group inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              className,
            )}
          />
        }
      >
        {info.title}
        <HelpCircle className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />
      </PopoverTrigger>

      <PopoverContent align={align} className="w-72 text-left">
        <div className="space-y-2">
          <p className="font-display text-sm font-semibold">{info.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground normal-case">
            {info.what}
          </p>

          {"formula" in info && (
            <div>
              <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                Calculated as
              </p>
              <code className="block rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-words normal-case">
                {info.formula}
              </code>
            </div>
          )}

          {"how" in info && (
            <p className="text-xs leading-relaxed text-muted-foreground normal-case">
              {info.how}
            </p>
          )}

          {"note" in info && (
            <p className="border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground normal-case">
              {info.note}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
