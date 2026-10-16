"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight } from "lucide-react";
import { recordTradeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { averageIn, formatINR, sellOut } from "@/lib/calc";
import { cn } from "@/lib/utils";

/** Log a buy or a sell; shares and the average buy price update together. */
export function RecordTrade({
  id,
  name,
  shares,
  buyPrice,
  price,
}: {
  id: string;
  name: string;
  shares: number;
  buyPrice: number;
  price: number;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("");
  const [at, setAt] = useState(String(price));
  const [pending, start] = useTransition();

  const sell = side === "sell";
  const q = Math.round(Number(qty));
  const p = Number(at);
  const preview =
    q > 0 && (sell || p > 0)
      ? sell
        ? sellOut(shares, buyPrice, q)
        : averageIn(shares, buyPrice, q, p)
      : null;
  const pnl = sell && q > 0 && p > 0 && buyPrice > 0
    ? (p - buyPrice) * Math.min(q, shares)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Record a buy or sell of ${name}`}
            className="size-8 text-muted-foreground hover:text-foreground"
          />
        }
      >
        <ArrowLeftRight className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          action={(fd) =>
            start(async () => {
              await recordTradeAction(fd);
              setQty("");
              setOpen(false);
            })
          }
          className="space-y-3"
        >
          <p className="font-display text-sm font-semibold">{name}</p>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="side" value={side} />

          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "rounded-sm py-1 text-xs font-medium capitalize",
                  side === s
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`qty-${id}`}>Shares</Label>
              <Input
                id={`qty-${id}`}
                name="qty"
                type="number"
                inputMode="numeric"
                min="1"
                max={sell ? shares : undefined}
                step="1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor={`at-${id}`}>At ₹/share</Label>
              <Input
                id={`at-${id}`}
                name="price"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.05"
                required={!sell}
                value={at}
                onChange={(e) => setAt(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {preview && (
            <p className="font-mono text-xs text-muted-foreground">
              {shares} → {preview.shares} shares · avg{" "}
              {buyPrice > 0 ? formatINR(buyPrice) : "—"} →{" "}
              {preview.buyPrice > 0 ? formatINR(preview.buyPrice) : "—"}
              {pnl !== null && (
                <span className={pnl >= 0 ? "text-under" : "text-destructive"}>
                  {" "}· {pnl >= 0 ? "+" : ""}
                  {formatINR(pnl)} realised
                </span>
              )}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            variant={sell ? "destructive" : "default"}
            className="w-full"
            disabled={pending || (sell && shares === 0)}
          >
            {pending ? "Saving…" : sell ? "Record sale" : "Record purchase"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
