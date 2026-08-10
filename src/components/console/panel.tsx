import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bordered container - the system's only in-flow depth device. */
export function Panel({
  className,
  ticked = false,
  ...props
}: ComponentProps<"section"> & { ticked?: boolean }) {
  return (
    <section
      className={cn("panel", ticked && "ticked", "animate-in fade-in duration-200", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-stroke px-6 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="label-mono mb-1.5">{eyebrow}</p> : null}
        <h3 className="font-heading text-base leading-snug text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-grey">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function Eyebrow({
  as: As = "p",
  className,
  ...props
}: ComponentProps<"p"> & { as?: ElementType }) {
  return <As className={cn("label-mono", className)} {...props} />;
}
