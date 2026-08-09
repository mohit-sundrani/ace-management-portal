import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  PanelsTopLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Console — plan events, run tasks, own the numbers" },
      {
        name: "description",
        content:
          "One workspace for events, tasks, calendar and finance. Every transaction links back to the event, budget and account it belongs to.",
      },
      { property: "og:title", content: "Operations Console" },
      {
        property: "og:description",
        content: "Events, tasks, calendar and double-checked finance in one operations workspace.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: PanelsTopLeft,
    label: "Events",
    copy: "Budget lines, guests, vendors and payment status for everything you run.",
  },
  {
    icon: ListChecks,
    label: "Tasks",
    copy: "Priorities and due dates that roll up into the events they belong to.",
  },
  {
    icon: CalendarDays,
    label: "Calendar",
    copy: "Events, task deadlines and payment dates on one timeline.",
  },
  {
    icon: CircleDollarSign,
    label: "Finance",
    copy: "Accounts, categories, budgets and statements with real running balances.",
  },
];

function Landing() {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b border-stroke px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-sm bg-electric font-mono text-xs text-white">
            OC
          </span>
          <span className="font-heading text-sm text-foreground">Operations Console</span>
        </div>
        <Button asChild variant="default" size="sm">
          <Link to={session ? "/dashboard" : "/auth"}>
            {loading ? "Loading" : session ? "Open console" : "Sign in"}
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-20">
        <p className="label-mono">Personal operations, one system</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl leading-tight tracking-tight text-foreground md:text-6xl">
          Everything you're running, with the money attached.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-grey">
          Operations Console links events, tasks, the calendar and your accounts into a single
          ledger-backed workspace — so a vendor payment, its budget line and its deadline are never
          three disconnected notes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="default" size="lg">
            <Link to={session ? "/dashboard" : "/auth"}>
              {session ? "Open console" : "Get started"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/auth">Sign in with Google</Link>
          </Button>
        </div>

        <section className="panel ticked mt-16 grid grid-cols-1 divide-y divide-stroke sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
          {PILLARS.map((pillar) => (
            <article key={pillar.label} className="space-y-2 p-6">
              <pillar.icon className="size-5 text-electric" strokeWidth={1.5} aria-hidden />
              <h2 className="font-heading text-base text-foreground">{pillar.label}</h2>
              <p className="text-sm text-grey">{pillar.copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
