import { CardSkeleton, HeaderSkeleton, ListSkeleton } from "@/components/skeletons";

export default function SentimentLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <CardSkeleton titleWidth="w-36">
          <ListSkeleton rows={4} />
        </CardSkeleton>
      </div>
    </>
  );
}
