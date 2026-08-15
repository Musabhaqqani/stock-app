import {
  CardSkeleton,
  ChartSkeleton,
  HeaderSkeleton,
  ListSkeleton,
} from "@/components/skeletons";

export default function HoldingsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CardSkeleton>
              <ChartSkeleton height={420} />
            </CardSkeleton>
          </div>
          <CardSkeleton titleWidth="w-36">
            <ChartSkeleton height={280} />
          </CardSkeleton>
        </div>
        <CardSkeleton titleWidth="w-28">
          <ListSkeleton rows={10} />
        </CardSkeleton>
      </div>
    </>
  );
}
