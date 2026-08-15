import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loadPortfolio } from "@/lib/portfolio";
import { buyNextRanking } from "@/lib/calc";
import { PageHeader } from "@/components/page-header";
import { RefreshPricesButton } from "@/components/refresh-prices-button";
import { MetricCards } from "@/components/metric-cards";
import { BuyNextList } from "@/components/buy-next-list";
import { TargetWeightNotice } from "@/components/target-weight-notice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Prices change; never serve this page from a static cache.
export const dynamic = "force-dynamic";

function formatStamp(date: Date | null): string {
  if (!date) return "no live prices yet";
  return `updated ${date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  })} IST`;
}

export default async function DashboardPage() {
  const { view } = await loadPortfolio();
  const buyNext = buyNextRanking(view.rows);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={formatStamp(view.lastPriceUpdate)}
        actions={<RefreshPricesButton />}
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <MetricCards view={view} />

        <TargetWeightNotice
          totalTargetPct={view.totalTargetPct}
          totalInvestmentTarget={view.totalInvestmentTarget}
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Buy next</CardTitle>
            <CardDescription>
              Most underweight first — a mechanical gap-to-target ordering, not
              investment advice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BuyNextList rows={buyNext} empty={view.holdingsCount === 0} />
          </CardContent>
        </Card>

        <div>
          {/* nativeButton={false} tells Base UI this renders an <a>, not a
              <button> — without it the component warns about lost semantics. */}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/holdings" />}
          >
            View holdings and charts
            <ArrowRight />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Prices are best-effort from a free data source and may be delayed or
          wrong — verify before acting on them.
        </p>
      </div>
    </>
  );
}
