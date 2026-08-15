import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Shapes that mirror the real layouts closely enough that the page doesn't
 * jump when data arrives. Used by the route-level loading.tsx files, which
 * Next renders instantly while the server component awaits its data.
 */

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-3">
      <Skeleton className="size-7 rounded-md" />
      <div className="ml-1 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg" />
    </header>
  );
}

export function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({
  children,
  titleWidth = "w-40",
}: {
  children: React.ReactNode;
  titleWidth?: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className={`h-5 ${titleWidth}`} />
        <Skeleton className="h-3 w-64 max-w-full" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}
