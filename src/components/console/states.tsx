import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="size-7 text-grey" strokeWidth={1.5} aria-hidden />
      <p className="label-mono">{eyebrow}</p>
      <h4 className="font-heading text-lg text-foreground">{title}</h4>
      <p className="max-w-sm text-sm text-grey">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "m-6 flex items-start gap-3 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="label-mono text-danger">Error</p>
        <p className="mt-1 text-sm text-grey">{message}</p>
      </div>
    </div>
  );
}

export function RowSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-stroke" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 px-6 py-3.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-4 rounded-xs bg-stroke" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("panel space-y-3 p-6", className)} aria-hidden>
      <Skeleton className="h-3 w-24 rounded-xs bg-stroke" />
      <Skeleton className="h-8 w-40 rounded-xs bg-stroke" />
      <Skeleton className="h-3 w-32 rounded-xs bg-stroke" />
    </div>
  );
}
