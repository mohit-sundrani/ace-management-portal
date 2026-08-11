import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const badge = cva(
    "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-wide",
    {
        variants: {
            tone: {
                neutral: "border-stroke bg-beige text-grey",
                success: "border-success/30 bg-success/10 text-success",
                warning: "border-warning/35 bg-warning/10 text-warning",
                danger: "border-danger/30 bg-danger/10 text-danger",
                info: "border-electric/30 bg-electric/10 text-electric",
            },
        },
        defaultVariants: { tone: "neutral" },
    },
);

export type Tone = NonNullable<VariantProps<typeof badge>["tone"]>;

export function StatusBadge({
    children,
    tone = "neutral",
    dot = true,
    live = false,
    className,
}: {
    children: ReactNode;
    tone?: Tone;
    dot?: boolean;
    live?: boolean;
    className?: string;
}) {
    return (
        <span className={cn(badge({ tone }), className)}>
            {dot ? (
                <span
                    aria-hidden
                    className={cn("size-1.5 shrink-0 rounded-full bg-current", live && "animate-pulse")}
                />
            ) : null}
            {children}
        </span>
    );
}

export const eventTone: Record<string, Tone> = {
    planning: "info",
    active: "success",
    completed: "neutral",
    cancelled: "danger",
};

export const taskTone: Record<string, Tone> = {
    todo: "neutral",
    ongoing: "info",
    complete: "success",
};

export const priorityTone: Record<string, Tone> = {
    low: "neutral",
    medium: "warning",
    high: "danger",
};

export const paymentTone: Record<string, Tone> = {
    unpaid: "danger",
    partial: "warning",
    paid: "success",
};

export const rsvpTone: Record<string, Tone> = {
    invited: "neutral",
    confirmed: "success",
    declined: "danger",
    tentative: "warning",
    attended: "info",
};
