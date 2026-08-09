import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  crumbs = [],
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: ReadonlyArray<Crumb>;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wide"
          >
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {crumb.to ? (
                  <Link to={crumb.to} className="text-grey transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="max-w-[16rem] truncate text-foreground">{crumb.label}</span>
                )}
                {index < crumbs.length - 1 ? <span className="text-stroke">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="font-heading text-3xl leading-snug tracking-tight text-foreground">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-grey">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
