"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StockSearch } from "@/components/stock-search";
import { addStockAction } from "@/app/actions";
import type { SuggestionWithPrice } from "@/app/(app)/search-actions";

export function AddStockDialog({ triggerLabel }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<SuggestionWithPrice | null>(null);

  function reset() {
    setPicked(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        <span className={triggerLabel ? "" : "sr-only sm:not-sr-only"}>
          {triggerLabel ?? "Add holding"}
        </span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Add a holding</DialogTitle>
          <DialogDescription>
            Search the NSE and pick a stock. Re-adding an existing ticker
            updates it instead of creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) =>
            start(async () => {
              await addStockAction(formData);
              toast.success(`Added ${String(formData.get("name"))}.`);
              setOpen(false);
              reset();
            })
          }
          className="space-y-4"
        >
          <div>
            <Label className="mb-1.5 block">Find a stock</Label>
            <StockSearch selected={picked} onSelect={setPicked} />
          </div>

          {/*
            The fields stay visible and editable after a pick: the search fills
            them in, but a ticker the provider doesn't list can still be entered
            by hand. `key` forces the defaults to re-apply on each selection.
          */}
          <div className="grid gap-4 sm:grid-cols-2" key={picked?.ticker ?? "blank"}>
            <div className="sm:col-span-2">
              <Label htmlFor="add-name">Company</Label>
              <Input
                id="add-name"
                name="name"
                required
                defaultValue={picked?.name ?? ""}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="add-ticker">NSE ticker</Label>
              <Input
                id="add-ticker"
                name="ticker"
                required
                placeholder="INFY"
                autoCapitalize="characters"
                defaultValue={picked?.ticker ?? ""}
                className="mt-1.5 font-mono uppercase"
              />
            </div>

            <div>
              <Label htmlFor="add-theme">Theme</Label>
              <Input
                id="add-theme"
                name="theme"
                placeholder="Enterprise Technology"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="add-target">Target %</Label>
              <Input
                id="add-target"
                name="targetPct"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                defaultValue={5}
                className="mt-1.5 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="add-shares">Shares held</Label>
              <Input
                id="add-shares"
                name="shares"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                defaultValue={0}
                className="mt-1.5 font-mono"
              />
            </div>

            {/* Seeds the price so the row isn't blank before the first fetch. */}
            <input type="hidden" name="price" value={picked?.price ?? 0} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add holding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
