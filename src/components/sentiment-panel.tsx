"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, MessageSquareText, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { analyseSentimentAction } from "@/app/(app)/sentiment/actions";
import type { SuggestionWithPrice } from "@/app/(app)/search-actions";
import { StockSearch } from "@/components/stock-search";
import type { SentimentReport } from "@/lib/sentiment";

const LEAN_COLOUR = {
  bullish: "var(--chart-2)",
  bearish: "var(--over)",
  neutral: "var(--muted-foreground)",
} as const;

export function SentimentPanel({ stocks }: { stocks: { ticker: string; name: string }[] }) {
  const [stock, setStock] = useState<{ ticker: string; name: string } | null>(stocks[0] ?? null);
  const [searched, setSearched] = useState<SuggestionWithPrice | null>(null);
  const [reports, setReports] = useState<Record<string, SentimentReport>>({});
  const [pending, start] = useTransition();
  const report = stock ? reports[stock.ticker] : undefined;
  const isHolding = stocks.some((s) => s.ticker === stock?.ticker);

  const run = (force: boolean) =>
    stock &&
    start(async () => {
      const res = await analyseSentimentAction(stock.ticker, stock.name, force);
      if (res.ok) setReports((r) => ({ ...r, [stock.ticker]: res.report }));
      else toast.error(res.error);
    });

  return (
    <>
      <div className="grid gap-3 sm:max-w-xl">
        {stocks.length > 0 && (
          <select
            aria-label="Your holdings"
            value={isHolding ? stock!.ticker : ""}
            onChange={(e) => {
              setStock(stocks.find((s) => s.ticker === e.target.value) ?? null);
              setSearched(null);
            }}
            className="h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="" disabled>
              Your holdings…
            </option>
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.name} ({s.ticker})
              </option>
            ))}
          </select>
        )}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            {stocks.length > 0 ? "…or search any NSE stock" : "Search any NSE stock"}
          </p>
          <StockSearch
            selected={searched}
            onSelect={(s) => {
              setSearched(s);
              setStock({ ticker: s.ticker, name: s.name });
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {stock && (
          <span className="text-sm">
            {stock.name} <span className="font-mono text-muted-foreground">({stock.ticker})</span>
          </span>
        )}
        <Button size="sm" disabled={pending || !stock} onClick={() => run(false)}>
          <MessageSquareText className={pending ? "animate-pulse" : undefined} />
          {pending ? "Reading the news…" : "Analyse"}
        </Button>
        {report && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(true)}>
            <RefreshCw /> <span className="sr-only sm:not-sr-only">Re-run</span>
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        This summarises the tone of recent headlines (and Reddit, once keys are set), not a
        price forecast or advice. Headlines often lag the price, and a few loud stories can skew it.
      </p>

      {pending && stock ? (
        <AnalysingCard name={stock.name} />
      ) : (
        report && <ReportCard report={report} />
      )}
    </>
  );
}

function ReportCard({ report: r }: { report: SentimentReport }) {
  const colour = LEAN_COLOUR[r.lean];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Sentiment</CardDescription>
          <CardTitle className="font-display text-3xl capitalize" style={{ color: colour }}>
            {r.lean}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="font-mono text-2xl" style={{ color: colour }}>
            {r.score > 0 ? "+" : ""}
            {r.score}
            <span className="text-sm text-muted-foreground"> / 100</span>
          </div>
          {/* -100…100 mapped onto a 0…100% bar, centred on neutral. */}
          <div className="relative h-2 rounded-full bg-muted">
            <div className="absolute top-0 left-1/2 h-2 w-px bg-border" />
            <div
              className="absolute top-0 h-2 rounded-full"
              style={{
                background: colour,
                left: `${Math.min(50, 50 + r.score / 2)}%`,
                width: `${Math.abs(r.score) / 2}%`,
              }}
            />
          </div>
          <div className="text-muted-foreground">
            <span className="capitalize">{r.confidence}</span> confidence · {r.postCount} items ·{" "}
            {new Date(r.analysedAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
          </div>
          <div className="flex flex-wrap gap-1">
            {r.themes.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display">What people are saying</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p>{r.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Points title="Bullish arguments" items={r.bullishPoints} colour={LEAN_COLOUR.bullish} />
            <Points title="Bearish arguments" items={r.bearishPoints} colour={LEAN_COLOUR.bearish} />
          </div>
        </CardContent>
      </Card>

      {r.keyPosts.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display">Key coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {r.keyPosts.map((p) => (
                <li key={p.url} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {p.title}
                  </a>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.source}
                    {p.score !== undefined && ` · ▲${p.score} · ${p.comments} comments`} ·{" "}
                    {p.createdAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Points({ title, items, colour }: { title: string; items: string[]; colour: string }) {
  return (
    <div>
      <h3 className="mb-1 font-medium" style={{ color: colour }}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground">None raised.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Rough pacing of the real pipeline (fetch ≈ 1-2 s, Gemini ≈ 5-15 s). The steps
// are timed, not reported by the server — the last one holds until it's done.
const STEPS = [
  { label: "Searching Google News", ms: 1500 },
  { label: "Collecting the last 30 days of headlines", ms: 2000 },
  { label: "Filtering out unrelated stories", ms: 2500 },
  { label: "Gemini is reading the coverage", ms: 4000 },
  { label: "Weighing bullish against bearish arguments", ms: 4000 },
  { label: "Writing the summary", ms: Infinity },
];

const TIPS = [
  "Sentiment often moves after the price, not before it.",
  "One big headline can swing the score — check the key coverage.",
  "Low confidence usually means few or mixed stories, not a neutral stock.",
  "Brokerage target changes tend to dominate stock headlines.",
  "Results stay cached for an hour; Re-run fetches fresh coverage.",
];

function AnalysingCard({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(STEPS[step].ms)) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEPS[step].ms);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tip = TIPS[Math.floor(elapsed / 5) % TIPS.length];

  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-live="polite" aria-busy="true">
      <Card>
        <CardHeader>
          <CardDescription>Analysing</CardDescription>
          <CardTitle className="font-display text-xl">{name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ol className="flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <li
                key={s.label}
                className={
                  i < step
                    ? "flex items-center gap-2 text-muted-foreground"
                    : i === step
                      ? "flex items-center gap-2 font-medium"
                      : "flex items-center gap-2 text-muted-foreground/40"
                }
              >
                {i < step ? (
                  <Check className="size-4" style={{ color: "var(--chart-2)" }} />
                ) : i === step ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <span className="size-4 rounded-full border border-current" />
                )}
                {s.label}
              </li>
            ))}
          </ol>
          <div className="font-mono text-xs text-muted-foreground">{elapsed}s elapsed</div>
          <p key={tip} className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in">
            <span className="font-medium text-foreground">Did you know? </span>
            {tip}
          </p>
        </CardContent>
      </Card>

      {/* Outline of the report so the layout doesn't jump when it lands. */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((c) => (
              <div key={c} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
