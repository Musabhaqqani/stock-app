import { CardSkeleton, HeaderSkeleton, ListSkeleton } from "@/components/skeletons";

export default function UsersLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <CardSkeleton titleWidth="w-20">
          <ListSkeleton rows={3} />
        </CardSkeleton>
      </div>
    </>
  );
}
