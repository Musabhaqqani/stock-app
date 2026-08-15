"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/calc";
import {
  searchStocksAction,
  type SuggestionWithPrice,
} from "@/app/(app)/search-actions";

/**
 * Typeahead over NSE symbols.
 *
 * Deliberately not shadcn's <Command>: that filters its own items client-side,
 * which fights a server-driven result list. This is a plain input plus a
 * listbox, which keeps the results exactly as the server returned them.
 */
export function StockSearch({
  onSelect,
  selected,
}: {
  onSelect: (s: SuggestionWithPrice) => void;
  selected: SuggestionWithPrice | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestionWithPrice[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced so a fast typist triggers one request, not one per keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      start(async () => {
        const found = await searchStocksAction(q);
        // A slow earlier request must not overwrite a newer one's results.
        if (cancelled) return;
        setResults(found);
        setActive(0);
        setOpen(true);
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close when focus or a click leaves the widget.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(s: SuggestionWithPrice) {
    onSelect(s);
    setQuery(`${s.name} (${s.ticker})`);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              // Don't submit the dialog's form while picking a suggestion.
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search NSE — e.g. Infosys, HDFC, TATA"
          aria-label="Search for a stock"
          aria-expanded={open}
          aria-controls="stock-search-results"
          role="combobox"
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-input bg-transparent pr-9 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {pending && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          id="stock-search-results"
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          {results.map((s, i) => (
            <li key={s.ticker}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">{s.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {s.ticker} · {s.exchange}
                  </div>
                </div>
                {s.price !== null && (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatINR(s.price)}
                  </span>
                )}
                {selected?.ticker === s.ticker && (
                  <Check className="size-4 shrink-0 text-under" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !pending && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          No NSE stock found for “{query.trim()}”. You can still enter the
          ticker manually below.
        </div>
      )}
    </div>
  );
}
