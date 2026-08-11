import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCell({
    label,
    value,
    caption,
    trend,
    emphasis = false,
    className,
}: {
    label: string;
    value: ReactNode;
    caption?: ReactNode;
    trend?: { direction: "up" | "down"; value: string; good?: boolean };
    emphasis?: boolean;
    className?: string;
}) {
    const Icon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight;
    const good = trend?.good ?? trend?.direction === "up";

    return (
        <div className={cn("flex flex-col gap-2 p-6", className)}>
            <p className="label-mono">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className={cn("stat-numeral text-2xl leading-tight xl:text-3xl", emphasis && "font-semibold")}>
                    {value}
                </span>
                {trend ? (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 font-mono text-xs",
                            good ? "text-success" : "text-danger",
                        )}
                    >
                        <Icon className="size-3.5" aria-hidden />
                        {trend.value}
                    </span>
                ) : null}
            </div>
            {caption ? <p className="text-xs text-grey">{caption}</p> : null}
        </div>
    );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "panel grid grid-cols-1 divide-y divide-stroke sm:grid-cols-2 sm:divide-x xl:grid-cols-4",
                "[&>*]:min-w-0",
                className,
            )}
        >
            {children}
        </div>
    );
}
