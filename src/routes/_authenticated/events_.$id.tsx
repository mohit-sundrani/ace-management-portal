import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { ErrorState, PanelSkeleton } from "@/components/console/states";
import {
  StatusBadge,
  eventTone,
  paymentTone,
  rsvpTone,
  taskTone,
} from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate, formatDateLong, formatRelative, timeRange, toISODate } from "@/lib/dates";
import { eventFinance } from "@/lib/finance";
import { formatAmount, formatMoney, toMinor, type Minor } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/events_/$id")({
  head: () => ({
    meta: [
      { title: "Event workspace — Operations Console" },
      {
        name: "description",
        content: "Budget lines, vendors, guests, payments and tasks for a single event.",
      },
      { property: "og:title", content: "Event workspace — Operations Console" },
      { property: "og:description", content: "One event, one accountable ledger." },
    ],
  }),
  component: EventDetail,
});

const vendorFields: ReadonlyArray<Field> = [
  { name: "name", label: "Vendor", type: "text", required: true },
  { name: "service", label: "Service", type: "text", placeholder: "Catering" },
  { name: "contact", label: "Contact", type: "text" },
  { name: "agreed_amount", label: "Agreed amount", type: "number", required: true },
  { name: "paid_amount", label: "Paid so far", type: "number" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const guestFields: ReadonlyArray<Field> = [
  { name: "name", label: "Guest", type: "text", required: true },
  { name: "contact", label: "Contact", type: "text" },
  {
    name: "rsvp",
    label: "RSVP",
    type: "select",
    required: true,
    options: [
      { value: "invited", label: "Invited" },
      { value: "confirmed", label: "Confirmed" },
      { value: "tentative", label: "Tentative" },
      { value: "declined", label: "Declined" },
      { value: "attended", label: "Attended" },
    ],
  },
  { name: "party_size", label: "Party size", type: "number" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const calendarFields: ReadonlyArray<Field> = [
  {
    name: "title",
    label: "Title",
    type: "text",
    required: true,
    placeholder: "Vendor walkthrough",
  },
  { name: "start_date", label: "Date", type: "date", required: true },
  { name: "start_time", label: "Start time", type: "time" },
  { name: "end_time", label: "End time", type: "time" },
  { name: "all_day", label: "All day", type: "switch" },
  { name: "location", label: "Location", type: "text" },
  { name: "description", label: "Description", type: "textarea" },
];

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
  { name: "notes", label: "Notes", type: "textarea" },
];

type DialogState =
  | { kind: "budget"; editing?: Row<"event_budget_items"> }
  | { kind: "vendor"; editing?: Row<"event_vendors"> }
  | { kind: "guest"; editing?: Row<"event_guests"> }
  | { kind: "payment"; editing?: Row<"event_payments"> }
  | { kind: "calendar"; editing?: Row<"calendar_items"> }
  | { kind: "event" }
  | null;

type DeleteState =
  | { kind: "item"; id: string; label: string }
  | { kind: "vendor"; id: string; label: string }
  | { kind: "guest"; id: string; label: string }
  | { kind: "payment"; id: string; label: string }
  | { kind: "calendar"; id: string; label: string }
  | { kind: "event"; id: string; label: string }
  | null;

/** Vendor remaining amount and payment status are derived, never stored by hand. */
const vendorPayload = (values: Record<string, unknown>) => {
  const agreed = Number(values["agreed_amount"] ?? 0);
  const paid = Number(values["paid_amount"] ?? 0);
  const remaining = agreed - paid;
  return {
    ...values,
    agreed_amount: agreed,
    paid_amount: paid,
    remaining_amount: remaining,
    status: paid <= 0 ? "unpaid" : remaining <= 0 ? "paid" : "partial",
  };
};

const guestPayload = (values: Record<string, unknown>) => ({
  ...values,
  party_size: Number(values["party_size"] ?? 1),
});

/** Payment status follows paid amount, so the ledger can never contradict itself. */
const paymentPayload = (values: Record<string, unknown>) => {
  const planned = Number(values["planned_amount"] ?? 0);
  const paid = Number(values["paid_amount"] ?? 0);
  return {
    ...values,
    planned_amount: planned,
    paid_amount: paid,
    status: paid <= 0 ? "unpaid" : paid >= planned ? "paid" : "partial",
  };
};

const eventPayload = (values: Record<string, unknown>) => ({
  ...values,
  planned_budget: Number(values["planned_budget"] ?? 0),
});

function EventDetail() {
  const { id } = useParams({ from: "/_authenticated/events_/$id" });
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleting, setDeleting] = useState<DeleteState>(null);

  const events = useCollection(
    "events",
    { filters: [{ column: "id", op: "eq", value: id }] },
    `event-${id}`,
  );
  const items = useCollection(
    "event_budget_items",
    { filters: [{ column: "event_id", op: "eq", value: id }] },
    `items-${id}`,
  );
  const vendors = useCollection(
    "event_vendors",
    { filters: [{ column: "event_id", op: "eq", value: id }] },
    `vendors-${id}`,
  );
  const guests = useCollection(
    "event_guests",
    { filters: [{ column: "event_id", op: "eq", value: id }] },
    `guests-${id}`,
  );
  const payments = useCollection(
    "event_payments",
    { filters: [{ column: "event_id", op: "eq", value: id }] },
    `payments-${id}`,
  );
  const tasks = useCollection(
    "tasks",
    { filters: [{ column: "event_id", op: "eq", value: id }] },
    `tasks-${id}`,
  );
  const calendar = useCollection(
    "calendar_items",
    {
      filters: [{ column: "event_id", op: "eq", value: id }],
      orderBy: { column: "start_date" },
    },
    `calendar-${id}`,
  );
  const transactions = useCollection(
    "transactions",
    {
      filters: [{ column: "event_id", op: "eq", value: id }],
      orderBy: { column: "occurred_on", ascending: false },
    },
    `txns-${id}`,
  );
  const categories = useCollection("categories", { orderBy: { column: "name" } });

  const createItem = useCreate("event_budget_items", "Budget line");
  const updateItem = useUpdate("event_budget_items", "Budget line");
  const removeItem = useRemove("event_budget_items", "Budget line");
  const createVendor = useCreate("event_vendors", "Vendor");
  const updateVendor = useUpdate("event_vendors", "Vendor");
  const removeVendor = useRemove("event_vendors", "Vendor");
  const createGuest = useCreate("event_guests", "Guest");
  const updateGuest = useUpdate("event_guests", "Guest");
  const removeGuest = useRemove("event_guests", "Guest");
  const createPayment = useCreate("event_payments", "Payment");
  const updatePayment = useUpdate("event_payments", "Payment");
  const removePayment = useRemove("event_payments", "Payment");
  const createCalendar = useCreate("calendar_items", "Calendar item");
  const updateCalendar = useUpdate("calendar_items", "Calendar item");
  const removeCalendar = useRemove("calendar_items", "Calendar item");
  const updateEvent = useUpdate("events", "Event");
  const removeEvent = useRemove("events", "Event");

  const budgetFields: ReadonlyArray<Field> = useMemo(
    () => [
      {
        name: "label",
        label: "Line item",
        type: "text",
        required: true,
        placeholder: "Stage rental",
      },
      {
        name: "kind",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ],
      },
      { name: "planned_amount", label: "Planned amount", type: "number", required: true },
      {
        name: "category_id",
        label: "Category",
        type: "select",
        options: (categories.data ?? []).map((category) => ({
          value: category.id,
          label: `${category.name} (${category.kind})`,
        })),
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    [categories.data],
  );

  const paymentFields: ReadonlyArray<Field> = useMemo(
    () => [
      {
        name: "label",
        label: "Payment",
        type: "text",
        required: true,
        placeholder: "Venue deposit",
      },
      {
        name: "direction",
        label: "Direction",
        type: "select",
        required: true,
        options: [
          { value: "expense", label: "Outgoing" },
          { value: "income", label: "Incoming" },
        ],
      },
      { name: "planned_amount", label: "Planned amount", type: "number", required: true },
      { name: "paid_amount", label: "Paid so far", type: "number" },
      { name: "due_date", label: "Due date", type: "date" },
      { name: "paid_on", label: "Paid on", type: "date" },
      {
        name: "vendor_id",
        label: "Vendor",
        type: "select",
        options: (vendors.data ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name })),
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    [vendors.data],
  );

  const event = (events.data ?? [])[0];

  const deleteBusy =
    removeItem.isPending ||
    removeVendor.isPending ||
    removeGuest.isPending ||
    removePayment.isPending ||
    removeCalendar.isPending ||
    removeEvent.isPending;

  const confirmDelete = () => {
    if (!deleting) return;
    const close = () => setDeleting(null);
    switch (deleting.kind) {
      case "item":
        removeItem.mutate(deleting.id, { onSuccess: close });
        break;
      case "vendor":
        removeVendor.mutate(deleting.id, { onSuccess: close });
        break;
      case "guest":
        removeGuest.mutate(deleting.id, { onSuccess: close });
        break;
      case "payment":
        removePayment.mutate(deleting.id, { onSuccess: close });
        break;
      case "calendar":
        removeCalendar.mutate(deleting.id, { onSuccess: close });
        break;
      case "event":
        removeEvent.mutate(deleting.id, {
          onSuccess: () => {
            close();
            void navigate({ to: "/events" });
          },
        });
        break;
    }
  };

  const taskTotal = (tasks.data ?? []).length;
  const taskDone = (tasks.data ?? []).filter((task) => task.status === "complete").length;
  const taskPercent = taskTotal === 0 ? 0 : Math.round((taskDone / taskTotal) * 100);

  const upcoming = useMemo(() => {
    const today = toISODate(new Date());
    const fromCalendar = (calendar.data ?? [])
      .filter((item) => item.start_date >= today)
      .map((item) => ({
        id: `item-${item.id}`,
        date: item.start_date,
        label: item.title,
        detail: item.all_day ? "All day" : timeRange(item.start_time, item.end_time),
      }));
    const fromPayments = (payments.data ?? [])
      .filter((payment) => payment.status !== "paid" && Boolean(payment.due_date))
      .map((payment) => ({
        id: `payment-${payment.id}`,
        date: payment.due_date as string,
        label: payment.label,
        detail: `${formatMoney(toMinor(payment.planned_amount - payment.paid_amount))} outstanding`,
      }));
    return [...fromCalendar, ...fromPayments]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [calendar.data, payments.data]);

  if (events.error) return <ErrorState message={(events.error as Error).message} />;
  if (events.isLoading) return <PanelSkeleton />;
  if (!event) return <ErrorState message="This event no longer exists." />;

  const finance = eventFinance(event, transactions.data ?? [], items.data ?? []);

  const rowActions = (label: string, onEdit: () => void, onDelete: () => void) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${label}`} onClick={onDelete}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  const itemColumns: ReadonlyArray<Column<Row<"event_budget_items">>> = [
    { key: "label", header: "Line item", cell: (row) => row.label },
    {
      key: "kind",
      header: "Type",
      cell: (row) => (
        <StatusBadge tone={row.kind === "income" ? "success" : "neutral"}>{row.kind}</StatusBadge>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) =>
        (categories.data ?? []).find((category) => category.id === row.category_id)?.name ?? "—",
    },
    {
      key: "planned",
      header: "Planned",
      align: "right",
      cell: (row) => formatAmount(row.planned_amount),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        rowActions(
          row.label,
          () => setDialog({ kind: "budget", editing: row }),
          () => setDeleting({ kind: "item", id: row.id, label: row.label }),
        ),
    },
  ];

  const vendorColumns: ReadonlyArray<Column<Row<"event_vendors">>> = [
    { key: "name", header: "Vendor", cell: (row) => row.name },
    { key: "service", header: "Service", cell: (row) => row.service ?? "—" },
    {
      key: "agreed",
      header: "Agreed",
      align: "right",
      cell: (row) => formatAmount(row.agreed_amount),
    },
    { key: "paid", header: "Paid", align: "right", cell: (row) => formatAmount(row.paid_amount) },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (row) => formatAmount(row.remaining_amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={paymentTone[row.status] ?? "neutral"}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        rowActions(
          row.name,
          () => setDialog({ kind: "vendor", editing: row }),
          () => setDeleting({ kind: "vendor", id: row.id, label: row.name }),
        ),
    },
  ];

  const guestColumns: ReadonlyArray<Column<Row<"event_guests">>> = [
    { key: "name", header: "Guest", cell: (row) => row.name },
    { key: "contact", header: "Contact", cell: (row) => row.contact ?? "—" },
    { key: "party", header: "Party", align: "right", cell: (row) => row.party_size },
    {
      key: "rsvp",
      header: "RSVP",
      cell: (row) => <StatusBadge tone={rsvpTone[row.rsvp] ?? "neutral"}>{row.rsvp}</StatusBadge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        rowActions(
          row.name,
          () => setDialog({ kind: "guest", editing: row }),
          () => setDeleting({ kind: "guest", id: row.id, label: row.name }),
        ),
    },
  ];

  const paymentColumns: ReadonlyArray<Column<Row<"event_payments">>> = [
    {
      key: "label",
      header: "Payment",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{row.label}</p>
          <p className="label-mono mt-1">
            {row.direction === "income" ? "incoming" : "outgoing"}
            {row.vendor_id
              ? ` · ${(vendors.data ?? []).find((vendor) => vendor.id === row.vendor_id)?.name ?? "vendor"}`
              : ""}
          </p>
        </div>
      ),
    },
    { key: "due", header: "Due", cell: (row) => formatDate(row.due_date) },
    {
      key: "planned",
      header: "Planned",
      align: "right",
      cell: (row) => formatAmount(row.planned_amount),
    },
    { key: "paid", header: "Paid", align: "right", cell: (row) => formatAmount(row.paid_amount) },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (row) => formatAmount(row.planned_amount - row.paid_amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={paymentTone[row.status] ?? "neutral"}>{row.status}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        rowActions(
          row.label,
          () => setDialog({ kind: "payment", editing: row }),
          () => setDeleting({ kind: "payment", id: row.id, label: row.label }),
        ),
    },
  ];

  const taskColumns: ReadonlyArray<Column<Row<"tasks">>> = [
    { key: "title", header: "Task", cell: (row) => row.title },
    { key: "due", header: "Due", cell: (row) => formatDate(row.due_date) },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={taskTone[row.status] ?? "neutral"}>{row.status}</StatusBadge>
      ),
    },
  ];

  const calendarColumns: ReadonlyArray<Column<Row<"calendar_items">>> = [
    { key: "title", header: "Item", cell: (row) => row.title },
    { key: "date", header: "Date", cell: (row) => formatDate(row.start_date) },
    {
      key: "time",
      header: "Time",
      cell: (row) => (row.all_day ? "All day" : timeRange(row.start_time, row.end_time)),
    },
    { key: "location", header: "Location", cell: (row) => row.location ?? "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        rowActions(
          row.title,
          () => setDialog({ kind: "calendar", editing: row }),
          () => setDeleting({ kind: "calendar", id: row.id, label: row.title }),
        ),
    },
  ];

  const txnColumns: ReadonlyArray<Column<Row<"transactions">>> = [
    { key: "date", header: "Date", cell: (row) => formatDate(row.occurred_on) },
    { key: "description", header: "Description", cell: (row) => row.description },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className={row.type === "income" ? "text-success" : undefined}>
          {row.type === "income" ? "+" : "−"}
          {formatAmount(row.amount)}
        </span>
      ),
    },
  ];

  const metricRow = (
    label: string,
    planned: Minor,
    actual: Minor,
    variance: Minor,
    good: boolean,
  ) => (
    <tr>
      <td className="px-6 py-3 text-foreground">{label}</td>
      <td className="stat-numeral px-6 py-3 text-right">{formatMoney(planned)}</td>
      <td className="stat-numeral px-6 py-3 text-right">{formatMoney(actual)}</td>
      <td
        className={cn(
          "stat-numeral px-6 py-3 text-right",
          variance === 0 ? "text-grey" : good ? "text-success" : "text-danger",
        )}
      >
        {formatMoney(variance, { signed: true })}
      </td>
    </tr>
  );

  return (
    <>
      <PageHeader
        title={event.name}
        description={event.description ?? "Event workspace"}
        crumbs={[{ label: "Events", to: "/events" }, { label: event.name }]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge
              tone={eventTone[event.status] ?? "neutral"}
              live={event.status === "active"}
            >
              {event.status}
            </StatusBadge>
            <Button size="sm" onClick={() => setDialog({ kind: "event" })}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleting({ kind: "event", id: event.id, label: event.name })}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
        }
      />

      <StatGrid>
        <StatCell
          label="Planned expense"
          value={formatMoney(finance.plannedExpense)}
          caption={`${formatDate(event.start_date)} start`}
          emphasis
        />
        <StatCell
          label="Actual expense"
          value={formatMoney(finance.actualExpense)}
          caption={`${finance.utilisation}% of plan`}
        />
        <StatCell
          label="Actual income"
          value={formatMoney(finance.actualIncome)}
          caption="Linked receipts"
        />
        <StatCell
          label="Net position"
          value={formatMoney(finance.actualProfit)}
          caption="Income less expense"
        />
      </StatGrid>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <PanelHeader eyebrow="Details" title="Event information" />
              <PanelBody>
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="label-mono">Status</dt>
                    <dd className="mt-1.5">
                      <StatusBadge
                        tone={eventTone[event.status] ?? "neutral"}
                        live={event.status === "active"}
                      >
                        {event.status}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt className="label-mono">Location</dt>
                    <dd className="mt-1.5 text-sm text-foreground">{event.location ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="label-mono">Starts</dt>
                    <dd className="mt-1.5 text-sm text-foreground">
                      {formatDateLong(event.start_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-mono">Ends</dt>
                    <dd className="mt-1.5 text-sm text-foreground">
                      {formatDateLong(event.end_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-mono">Planned budget</dt>
                    <dd className="mt-1.5 text-sm text-foreground">
                      {formatAmount(event.planned_budget)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-mono">Last updated</dt>
                    <dd className="mt-1.5 text-sm text-foreground">
                      {formatRelative(event.updated_at)}
                    </dd>
                  </div>
                </dl>
                {event.notes ? (
                  <p className="mt-6 rounded-sm border border-stroke bg-beige/40 p-4 text-sm text-foreground">
                    {event.notes}
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            <div className="space-y-6">
              <Panel>
                <PanelHeader eyebrow="Reconciliation" title="Planned vs actual" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stroke">
                        <th className="label-mono px-6 py-3 text-left font-normal">Metric</th>
                        <th className="label-mono px-6 py-3 text-right font-normal">Planned</th>
                        <th className="label-mono px-6 py-3 text-right font-normal">Actual</th>
                        <th className="label-mono px-6 py-3 text-right font-normal">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke">
                      {metricRow(
                        "Income",
                        finance.plannedIncome,
                        finance.actualIncome,
                        finance.incomeVariance,
                        finance.incomeVariance >= 0,
                      )}
                      {metricRow(
                        "Expense",
                        finance.plannedExpense,
                        finance.actualExpense,
                        finance.expenseVariance,
                        finance.expenseVariance <= 0,
                      )}
                      {metricRow(
                        "Profit",
                        finance.expectedProfit,
                        finance.actualProfit,
                        finance.actualProfit - finance.expectedProfit,
                        finance.actualProfit >= finance.expectedProfit,
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel>
                <PanelHeader eyebrow="Progress" title="Task completion" />
                <PanelBody>
                  <p className="stat-numeral text-2xl leading-tight">
                    {taskDone}
                    <span className="text-grey"> / {taskTotal}</span>
                  </p>
                  <p className="mt-1 text-xs text-grey">tasks complete</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-beige">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${taskPercent}%` }}
                    />
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </div>

          <Panel className="mt-6">
            <PanelHeader eyebrow="Upcoming" title="Next scheduled activity" />
            {upcoming.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-grey">
                Nothing scheduled — add calendar items or payments to see them here.
              </p>
            ) : (
              <ul className="divide-y divide-stroke">
                {upcoming.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-6 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{entry.label}</p>
                      <p className="label-mono mt-1">{entry.detail}</p>
                    </div>
                    <span className="font-mono text-xs text-grey">
                      {formatDateLong(entry.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <Panel>
            <PanelHeader
              eyebrow="Planning"
              title="Budget lines"
              actions={
                <Button size="sm" onClick={() => setDialog({ kind: "budget" })}>
                  <Plus className="size-4" aria-hidden />
                  Add line
                </Button>
              }
            />
            <DataTable
              columns={itemColumns}
              rows={items.data ?? []}
              emptyLabel="No budget lines yet"
            />
          </Panel>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <Panel>
            <PanelHeader
              eyebrow="Suppliers"
              title="Vendors"
              actions={
                <Button size="sm" onClick={() => setDialog({ kind: "vendor" })}>
                  <Plus className="size-4" aria-hidden />
                  Add vendor
                </Button>
              }
            />
            <DataTable
              columns={vendorColumns}
              rows={vendors.data ?? []}
              emptyLabel="No vendors yet"
            />
          </Panel>
        </TabsContent>

        <TabsContent value="guests" className="mt-4">
          <Panel>
            <PanelHeader
              eyebrow="Attendance"
              title="Guest list"
              actions={
                <Button size="sm" onClick={() => setDialog({ kind: "guest" })}>
                  <Plus className="size-4" aria-hidden />
                  Add guest
                </Button>
              }
            />
            <DataTable columns={guestColumns} rows={guests.data ?? []} emptyLabel="No guests yet" />
          </Panel>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Panel>
            <PanelHeader
              eyebrow="Cash"
              title="Scheduled payments"
              actions={
                <Button size="sm" onClick={() => setDialog({ kind: "payment" })}>
                  <Plus className="size-4" aria-hidden />
                  Add payment
                </Button>
              }
            />
            <DataTable
              columns={paymentColumns}
              rows={payments.data ?? []}
              emptyLabel="No payments scheduled"
            />
          </Panel>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Panel>
            <PanelHeader eyebrow="Execution" title="Linked tasks" />
            <DataTable
              columns={taskColumns}
              rows={tasks.data ?? []}
              emptyLabel="No tasks linked to this event"
            />
          </Panel>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Panel>
            <PanelHeader
              eyebrow="Schedule"
              title="Event calendar"
              actions={
                <Button size="sm" onClick={() => setDialog({ kind: "calendar" })}>
                  <Plus className="size-4" aria-hidden />
                  Add item
                </Button>
              }
            />
            <DataTable
              columns={calendarColumns}
              rows={calendar.data ?? []}
              emptyLabel="Nothing scheduled for this event yet"
            />
          </Panel>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Panel>
            <PanelHeader eyebrow="Finance" title="Linked transactions" />
            <DataTable
              columns={txnColumns}
              rows={transactions.data ?? []}
              emptyLabel="No transactions linked yet"
            />
          </Panel>
        </TabsContent>
      </Tabs>

      <RecordDialog
        open={dialog?.kind === "event"}
        onOpenChange={(next) => setDialog(next ? { kind: "event" } : null)}
        title="Edit event"
        description="Update the basics — budget lines, vendors and guests stay attached."
        fields={eventFields}
        initial={event}
        submitLabel="Save changes"
        busy={updateEvent.isPending}
        onSubmit={(values) =>
          updateEvent.mutate({ id: event.id, values: eventPayload(values) } as never, {
            onSuccess: () => setDialog(null),
          })
        }
      />

      <RecordDialog
        open={dialog?.kind === "budget"}
        onOpenChange={(next) => setDialog(next ? { kind: "budget" } : null)}
        title={dialog?.kind === "budget" && dialog.editing ? "Edit budget line" : "Add budget line"}
        fields={budgetFields}
        initial={dialog?.kind === "budget" ? (dialog.editing ?? { kind: "expense" }) : null}
        busy={createItem.isPending || updateItem.isPending}
        onSubmit={(values) => {
          if (dialog?.kind === "budget" && dialog.editing) {
            updateItem.mutate({ id: dialog.editing.id, values } as never, {
              onSuccess: () => setDialog(null),
            });
          } else {
            createItem.mutate({ ...values, event_id: id } as never, {
              onSuccess: () => setDialog(null),
            });
          }
        }}
      />

      <RecordDialog
        open={dialog?.kind === "vendor"}
        onOpenChange={(next) => setDialog(next ? { kind: "vendor" } : null)}
        title={dialog?.kind === "vendor" && dialog.editing ? "Edit vendor" : "Add vendor"}
        fields={vendorFields}
        initial={dialog?.kind === "vendor" ? (dialog.editing ?? { paid_amount: "0" }) : null}
        busy={createVendor.isPending || updateVendor.isPending}
        onSubmit={(values) => {
          if (dialog?.kind === "vendor" && dialog.editing) {
            updateVendor.mutate({ id: dialog.editing.id, values: vendorPayload(values) } as never, {
              onSuccess: () => setDialog(null),
            });
          } else {
            createVendor.mutate({ ...vendorPayload(values), event_id: id } as never, {
              onSuccess: () => setDialog(null),
            });
          }
        }}
      />

      <RecordDialog
        open={dialog?.kind === "guest"}
        onOpenChange={(next) => setDialog(next ? { kind: "guest" } : null)}
        title={dialog?.kind === "guest" && dialog.editing ? "Edit guest" : "Add guest"}
        fields={guestFields}
        initial={
          dialog?.kind === "guest" ? (dialog.editing ?? { rsvp: "invited", party_size: "1" }) : null
        }
        busy={createGuest.isPending || updateGuest.isPending}
        onSubmit={(values) => {
          if (dialog?.kind === "guest" && dialog.editing) {
            updateGuest.mutate({ id: dialog.editing.id, values: guestPayload(values) } as never, {
              onSuccess: () => setDialog(null),
            });
          } else {
            createGuest.mutate({ ...guestPayload(values), event_id: id } as never, {
              onSuccess: () => setDialog(null),
            });
          }
        }}
      />

      <RecordDialog
        open={dialog?.kind === "payment"}
        onOpenChange={(next) => setDialog(next ? { kind: "payment" } : null)}
        title={dialog?.kind === "payment" && dialog.editing ? "Edit payment" : "Add payment"}
        fields={paymentFields}
        initial={dialog?.kind === "payment" ? (dialog.editing ?? { direction: "expense" }) : null}
        busy={createPayment.isPending || updatePayment.isPending}
        onSubmit={(values) => {
          if (dialog?.kind === "payment" && dialog.editing) {
            updatePayment.mutate(
              { id: dialog.editing.id, values: paymentPayload(values) } as never,
              {
                onSuccess: () => setDialog(null),
              },
            );
          } else {
            createPayment.mutate({ ...paymentPayload(values), event_id: id } as never, {
              onSuccess: () => setDialog(null),
            });
          }
        }}
      />

      <RecordDialog
        open={dialog?.kind === "calendar"}
        onOpenChange={(next) => setDialog(next ? { kind: "calendar" } : null)}
        title={
          dialog?.kind === "calendar" && dialog.editing ? "Edit calendar item" : "Add calendar item"
        }
        fields={calendarFields}
        initial={
          dialog?.kind === "calendar"
            ? (dialog.editing ?? { all_day: false, start_date: event.start_date })
            : null
        }
        busy={createCalendar.isPending || updateCalendar.isPending}
        onSubmit={(values) => {
          if (dialog?.kind === "calendar" && dialog.editing) {
            updateCalendar.mutate({ id: dialog.editing.id, values } as never, {
              onSuccess: () => setDialog(null),
            });
          } else {
            createCalendar.mutate({ ...values, event_id: id } as never, {
              onSuccess: () => setDialog(null),
            });
          }
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title={deleting ? `Delete “${deleting.label}”?` : "Delete item"}
        description={
          deleting?.kind === "event"
            ? "Budget lines, guests, vendors and payments are removed with it. Linked transactions, tasks and calendar items keep their history but lose the event link."
            : deleting?.kind === "vendor"
              ? "Scheduled payments that reference this vendor stay in the ledger but lose the vendor link."
              : "This will be permanently removed from the event workspace."
        }
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
