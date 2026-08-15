import {
  CardSkeleton,
  HeaderSkeleton,
  ListSkeleton,
  MetricCardsSkeleton,
} from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <MetricCardsSkeleton />
        <CardSkeleton titleWidth="w-24">
          <ListSkeleton rows={8} />
        </CardSkeleton>
      </div>
    </>
  );
}
