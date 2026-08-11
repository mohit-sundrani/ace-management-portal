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
        <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
            <Icon className="text-grey size-7" strokeWidth={1.5} aria-hidden />
            <p className="label-mono">{eyebrow}</p>
            <h4 className="font-heading text-foreground text-lg">{title}</h4>
            <p className="text-grey max-w-sm text-sm">{description}</p>
            {action ? <div className="mt-2">{action}</div> : null}
        </div>
    );
}

export function ErrorState({ message, className }: { message: string; className?: string }) {
    return (
        <div
            role="alert"
            className={cn(
                "border-danger/30 bg-danger/5 m-6 flex items-start gap-3 rounded-sm border px-4 py-3",
                className,
            )}
        >
            <AlertTriangle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
                <p className="label-mono text-danger">Error</p>
                <p className="text-grey mt-1 text-sm">{message}</p>
            </div>
        </div>
    );
}

export function RowSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="divide-stroke divide-y" aria-hidden>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="grid gap-4 px-6 py-3.5"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
                >
                    {Array.from({ length: columns }).map((__, colIndex) => (
                        <Skeleton key={colIndex} className="bg-stroke h-4 rounded-xs" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function PanelSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("panel space-y-3 p-6", className)} aria-hidden>
            <Skeleton className="bg-stroke h-3 w-24 rounded-xs" />
            <Skeleton className="bg-stroke h-8 w-40 rounded-xs" />
            <Skeleton className="bg-stroke h-3 w-32 rounded-xs" />
        </div>
    );
}
