import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-800/40 border border-slate-700/20",
        className
      )}
      {...props}
    />
  );
}

export function BountyCardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-radar-border bg-radar-surface/60 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-12 w-full" />
      <div className="pt-3 border-t border-radar-border/60 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}
