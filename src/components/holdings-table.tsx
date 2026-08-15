import { Search, Trash2 } from "lucide-react";
import { deleteStockAction } from "@/app/actions";
import { formatINR, formatPct, type HoldingRow } from "@/lib/calc";
import { EditableNumber } from "@/components/editable-number";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ColumnInfo } from "@/components/column-info";
import { AddStockDialog } from "@/components/add-stock-dialog";

/** Marks a price the fetcher hasn't been able to refresh recently. */
function staleness(lastPriceUpdate: Date | string | null): string | null {
  if (!lastPriceUpdate) return "manual";
  const hours = (Date.now() - new Date(lastPriceUpdate).getTime()) / 3_600_000;
  if (hours < 1) return null;
  if (hours < 24) return `${Math.floor(hours)}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteStockAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${name}`}
        className="size-8 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

function GapValue({ gap }: { gap: number }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        gap >= 0 ? "text-under" : "text-destructive",
      )}
    >
      {gap >= 0 ? "+" : ""}
      {formatPct(gap)}
    </span>
  );
}

export function HoldingsTable({ rows }: { rows: HoldingRow[] }) {
  // New accounts start empty by design — a portfolio is personal, so nothing is
  // seeded and the first screen is a prompt to search for a stock.
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Search className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">No holdings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Search the NSE for a stock to start building your portfolio.
          </p>
        </div>
        <AddStockDialog triggerLabel="Add your first holding" />
      </div>
    );
  }

  return (
    <>
      {/*
        Phones get cards, not a table: nine numeric columns cannot compress to
        360px without either horizontal scrolling or unreadable text.
      */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => {
          const stale = staleness(row.lastPriceUpdate);

          return (
            <li key={row.id} className="space-y-3 py-4 first:pt-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{row.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.ticker} · {row.theme}
                  </div>
                </div>
                <DeleteButton id={row.id} name={row.name} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">
                    <ColumnInfo column="price" align="start" />
                  </div>
                  <EditableNumber
                    id={row.id}
                    field="price"
                    value={row.price}
                    step="0.05"
                    label={`Price for ${row.name}`}
                    prefix="₹"
                    align="left"
                    className="w-full"
                  />
                  {stale && (
                    <div className="text-[10px] text-muted-foreground">{stale}</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    <ColumnInfo column="shares" align="start" />
                  </div>
                  <EditableNumber
                    id={row.id}
                    field="shares"
                    value={row.shares}
                    label={`Shares of ${row.name}`}
                    align="left"
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    <ColumnInfo column="target" align="center" />
                  </div>
                  <EditableNumber
                    id={row.id}
                    field="targetPct"
                    value={row.targetPct}
                    step="0.5"
                    label={`Target percent for ${row.name}`}
                    align="left"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatINR(row.currentValue)} · now{" "}
                  {formatPct(row.currentWeightPct)}
                </span>
                <span className="flex items-center gap-2">
                  <GapValue gap={row.gap} />
                  {row.sharesToBuyNext > 0 && (
                    <Badge
                      variant="outline"
                      className="border-under/40 font-mono text-under"
                    >
                      +{row.sharesToBuyNext}
                    </Badge>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Full table from md up, still scrollable if the viewport is narrow. */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="price" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="shares" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="value" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="now" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="target" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="gap" />
              </TableHead>
              <TableHead className="text-right">
                <ColumnInfo column="toBuy" />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => {
              const stale = staleness(row.lastPriceUpdate);

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.ticker} · {row.theme}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <EditableNumber
                      id={row.id}
                      field="price"
                      value={row.price}
                      step="0.05"
                      label={`Price for ${row.name}`}
                      className="w-24"
                    />
                    {stale && (
                      <div className="text-[10px] text-muted-foreground">
                        {stale}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <EditableNumber
                      id={row.id}
                      field="shares"
                      value={row.shares}
                      label={`Shares of ${row.name}`}
                      className="w-16"
                    />
                  </TableCell>

                  <TableCell className="num">
                    {formatINR(row.currentValue)}
                  </TableCell>
                  <TableCell className="num">
                    {formatPct(row.currentWeightPct)}
                  </TableCell>

                  <TableCell className="text-right">
                    <EditableNumber
                      id={row.id}
                      field="targetPct"
                      value={row.targetPct}
                      step="0.5"
                      label={`Target percent for ${row.name}`}
                      className="w-14"
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <GapValue gap={row.gap} />
                  </TableCell>

                  <TableCell className="num">
                    {row.sharesToBuyNext > 0 ? (
                      <span className="text-under">+{row.sharesToBuyNext}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <DeleteButton id={row.id} name={row.name} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

    </>
  );
}
