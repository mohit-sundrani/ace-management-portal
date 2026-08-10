import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PanelsTopLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge, eventTone } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { useCollection, useCreate } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { eventFinance } from "@/lib/finance";
import { formatAmount, formatMoney, sumMinor } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Events - ACE Management" },
      {
        name: "description",
        content: "Plan events end to end: budgets, vendors, guests, payments and linked tasks.",
      },
      { property: "og:title", content: "Events - ACE Management" },
      { property: "og:description", content: "Every event with its budget and execution status." },
    ],
  }),
  component: EventsPage,
});

const eventFields: ReadonlyArray<Field> = [
  {
    name: "name",
    label: "Event name",
    type: "text",
    required: true,
    placeholder: "Annual college fest",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "planning", label: "Planning" },
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  { name: "start_date", label: "Start date", type: "date", required: true },
  { name: "end_date", label: "End date", type: "date" },
  { name: "location", label: "Location", type: "text", placeholder: "Main auditorium" },
  { name: "planned_budget", label: "Planned budget", type: "number", placeholder: "0.00" },
  { name: "description", label: "Description", type: "textarea" },
];

function EventsPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const events = useCollection("events", { orderBy: { column: "start_date", ascending: false } });
  const transactions = useCollection("transactions", {});
  const items = useCollection("event_budget_items", {});
  const create = useCreate("events", "Event");

  const rows = events.data ?? [];
  const txns = transactions.data ?? [];
  const budgetItems = items.data ?? [];

  const totals = useMemo(() => {
    const planned = sumMinor(rows.map((event) => event.planned_budget));
    const spent = rows.reduce(
      (acc, event) => acc + eventFinance(event, txns, budgetItems).actualExpense,
      0,
    );
    return { planned, spent };
  }, [rows, txns, budgetItems]);

  const columns: ReadonlyArray<Column<Row<"events">>> = [
    {
      key: "name",
      header: "Event",
      cell: (event) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{event.name}</p>
          <p className="label-mono mt-1">{event.location ?? "No location"}</p>
        </div>
      ),
    },
    { key: "dates", header: "Dates", cell: (event) => formatDate(event.start_date) },
    {
      key: "status",
      header: "Status",
      cell: (event) => (
        <StatusBadge tone={eventTone[event.status] ?? "neutral"} live={event.status === "active"}>
          {event.status}
        </StatusBadge>
      ),
    },
    {
      key: "planned",
      header: "Planned",
      align: "right",
      cell: (event) => formatAmount(event.planned_budget),
    },
    {
      key: "spent",
      header: "Spent",
      align: "right",
      cell: (event) => formatMoney(eventFinance(event, txns, budgetItems).actualExpense),
    },
    {
      key: "open",
      header: "",
      align: "right",
      cell: (event) => (
        <Link
          to="/events/$id"
          params={{ id: event.id }}
          className="font-mono text-xs uppercase tracking-wide text-electric hover:underline"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          Open
        </Link>
      ),
    },
  ];

  if (events.error) return <ErrorState message={(events.error as Error).message} />;

  return (
    <>
      <PageHeader
        title="Events"
        description="Each event carries its own budget, vendors, guests and payment ledger."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New event
          </Button>
        }
      />

      <StatGrid className="xl:grid-cols-3">
        <StatCell label="Events" value={rows.length} caption="All time" emphasis />
        <StatCell
          label="Planned budget"
          value={formatMoney(totals.planned)}
          caption="Across events"
        />
        <StatCell
          label="Actual spend"
          value={formatMoney(totals.spent)}
          caption="Linked transactions"
        />
      </StatGrid>

      <Panel className="mt-6">
        <PanelHeader eyebrow="Portfolio" title="All events" />
        {events.isLoading ? (
          <RowSkeleton columns={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={PanelsTopLeft}
            eyebrow="No events"
            title="Plan your first event"
            description="Create an event to track its budget, vendors, guests and linked spend."
            action={<Button onClick={() => setOpen(true)}>New event</Button>}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(event) => void navigate({ to: "/events/$id", params: { id: event.id } })}
          />
        )}
      </Panel>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="New event"
        description="Set the basics now; budget lines, vendors and guests come next."
        fields={eventFields}
        initial={{ status: "planning", planned_budget: "0" }}
        submitLabel="Create event"
        busy={create.isPending}
        onSubmit={(values) => {
          create.mutate(values as never, { onSuccess: () => setOpen(false) });
        }}
      />
    </>
  );
}
