import { loadPortfolio } from "@/lib/portfolio";
import { PageHeader } from "@/components/page-header";
import { HoldingsTable } from "@/components/holdings-table";
import { AddStockDialog } from "@/components/add-stock-dialog";
import { RefreshPricesButton } from "@/components/refresh-prices-button";
import { TargetWeightNotice } from "@/components/target-weight-notice";
import { WeightChart } from "@/components/weight-chart";
import { AllocationDonut } from "@/components/allocation-donut";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatINR } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const { view } = await loadPortfolio();

  return (
    <>
      <PageHeader
        title="Holdings"
        subtitle={`${view.holdingsCount} stocks · ${formatINR(view.totalCurrentValue)}`}
        actions={
          <>
            <RefreshPricesButton />
            <AddStockDialog />
          </>
        }
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <TargetWeightNotice
          totalTargetPct={view.totalTargetPct}
          totalInvestmentTarget={view.totalInvestmentTarget}
        />

        {/* Charts sit with the holdings they describe. Stacked on mobile. */}
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="font-display">Current vs target weight</CardTitle>
              <CardDescription>
                Amber bars are below their target weight, red are above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeightChart rows={view.rows} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Allocation by value</CardTitle>
              <CardDescription>Grouped by theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationDonut rows={view.rows} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">All holdings</CardTitle>
            <CardDescription>
              Edit price, shares or target inline — changes save when you tap away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HoldingsTable rows={view.rows} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
