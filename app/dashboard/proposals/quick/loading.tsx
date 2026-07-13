import { Skeleton } from "@/components/ui/skeleton";

export default function QuickProposalLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[520px] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
