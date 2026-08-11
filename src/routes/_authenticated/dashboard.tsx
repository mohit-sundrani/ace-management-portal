import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CalendarDays, ListChecks, PanelsTopLeft, Target } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/console/states";
import { StatusBadge, eventTone, taskTone, type Tone } from "@/components/console/status-badge";
import { useCollection } from "@/hooks/use-collection";
import { formatDate, formatDayLabel, timeRange, toISODate } from "@/lib/dates";
import { budgetHealth, eventFinance, netCashFlow, totalBalance, totalExpense, totalIncome } from "@/lib/finance";
import { formatAmount, formatMoney, toMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/dashboard")({
    head: () => ({
        meta: [
            { title: "Dashboard - ACE Management" },
            {
                name: "description",
                content: "Live snapshot of balances, cash flow, active events and open tasks.",
            },
            { property: "og:title", content: "Dashboard - ACE Management" },
            { property: "og:description", content: "Balances, cash flow, events and tasks at a glance." },
        ],
    }),
    component: Dashboard,
});

const kindTone: Record<string, Tone> = {
    item: "info",
    task: "warning",
    event: "success",
    payment: "info",
};

type Entry = {
    id: string;
    label: string;
    detail: string;
    kind: string;
    date?: string;
    badge?: { label: string; tone: Tone };
};

function EntryList({ entries, empty }: { entries: ReadonlyArray<Entry>; empty: ReactNode }) {
    if (entries.length === 0) return empty;
    return (
        <ul className="divide-y divide-stroke">
            {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                    <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{entry.label}</p>
                        <p className="label-mono mt-1">{entry.detail}</p>
                    </div>
                    {entry.badge ? (
                        <StatusBadge tone={entry.badge.tone}>{entry.badge.label}</StatusBadge>
                    ) : entry.date ? (
                        <span className="shrink-0 font-mono text-xs text-grey">{formatDayLabel(entry.date)}</span>
                    ) : (
                        <StatusBadge tone={kindTone[entry.kind] ?? "neutral"}>{entry.kind}</StatusBadge>
                    )}
                </li>
            ))}
        </ul>
    );
}

function Dashboard() {
    const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
    const transactions = useCollection("transactions", {
        orderBy: { column: "occurred_on", ascending: false },
    });
    const events = useCollection("events", { orderBy: { column: "start_date" } });
    const tasks = useCollection("tasks", { orderBy: { column: "due_date" } });
    const budgets = useCollection("budgets", { orderBy: { column: "start_date", ascending: false } });
    const calendar = useCollection("calendar_items", { orderBy: { column: "start_date" } });
    const payments = useCollection("event_payments", {});
    const vendors = useCollection("event_vendors", {});

    const error =
        accounts.error ??
        transactions.error ??
        events.error ??
        tasks.error ??
        budgets.error ??
        calendar.error ??
        payments.error ??
        vendors.error;
    const loading =
        accounts.isLoading ||
        transactions.isLoading ||
        events.isLoading ||
        tasks.isLoading ||
        budgets.isLoading ||
        calendar.isLoading ||
        payments.isLoading ||
        vendors.isLoading;

    const txns = useMemo(() => transactions.data ?? [], [transactions.data]);

    const todayEntries = useMemo(() => {
        const today = toISODate(new Date());
        const fromCalendar = (calendar.data ?? [])
            .filter((item) => item.start_date === today)
            .map((item) => ({
                id: `item-${item.id}`,
                label: item.title,
                detail: item.all_day ? "All day" : timeRange(item.start_time, item.end_time),
                kind: "item",
            }));
        const fromTasks = (tasks.data ?? [])
            .filter((task) => task.status !== "complete" && (task.scheduled_date === today || task.due_date === today))
            .map((task) => ({
                id: `task-${task.id}`,
                label: task.title,
                detail: task.scheduled_date === today ? "scheduled today" : "due today",
                kind: "task",
            }));
        const fromPayments = (payments.data ?? [])
            .filter((payment) => payment.status !== "paid" && payment.due_date === today)
            .map((payment) => ({
                id: `payment-${payment.id}`,
                label: payment.label,
                detail: `${formatMoney(toMinor(payment.planned_amount - payment.paid_amount))} due today`,
                kind: "payment",
            }));
        return [...fromCalendar, ...fromTasks, ...fromPayments];
    }, [calendar.data, tasks.data, payments.data]);

    const upcoming = useMemo(() => {
        const today = toISODate(new Date());
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + 14);
        const by = toISODate(horizon);
        const fromEvents = (events.data ?? [])
            .filter((event) => event.start_date >= today && event.start_date <= by && event.status !== "cancelled")
            .map((event) => ({
                id: `event-${event.id}`,
                date: event.start_date,
                label: event.name,
                detail: event.location ?? "event",
                kind: "event",
            }));
        const fromTasks = (tasks.data ?? [])
            .filter(
                (task) =>
                    task.status !== "complete" &&
                    Boolean(task.due_date) &&
                    (task.due_date as string) >= today &&
                    (task.due_date as string) <= by,
            )
            .map((task) => ({
                id: `task-${task.id}`,
                date: task.due_date as string,
                label: task.title,
                detail: "task due",
                kind: "task",
            }));
        const fromPayments = (payments.data ?? [])
            .filter(
                (payment) =>
                    payment.status !== "paid" &&
                    Boolean(payment.due_date) &&
                    (payment.due_date as string) >= today &&
                    (payment.due_date as string) <= by,
            )
            .map((payment) => ({
                id: `payment-${payment.id}`,
                date: payment.due_date as string,
                label: payment.label,
                detail: `${formatMoney(toMinor(payment.planned_amount - payment.paid_amount))} due`,
                kind: "payment",
            }));
        return [...fromEvents, ...fromTasks, ...fromPayments]
            .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
            .slice(0, 8);
    }, [events.data, tasks.data, payments.data]);

    const alerts = useMemo(() => {
        const today = toISODate(new Date());
        const overdueTasks = (tasks.data ?? [])
            .filter((task) => task.status !== "complete" && Boolean(task.due_date) && (task.due_date as string) < today)
            .map((task) => ({
                id: `task-${task.id}`,
                label: task.title,
                detail: `overdue since ${formatDate(task.due_date)}`,
                kind: "task",
                badge: { label: "overdue", tone: "danger" as const },
            }));
        const overduePayments = (payments.data ?? [])
            .filter(
                (payment) =>
                    payment.status !== "paid" && Boolean(payment.due_date) && (payment.due_date as string) < today,
            )
            .map((payment) => ({
                id: `payment-${payment.id}`,
                label: payment.label,
                detail: `${formatMoney(toMinor(payment.planned_amount - payment.paid_amount))} outstanding`,
                kind: "payment",
                badge: { label: "overdue", tone: "danger" as const },
            }));
        const overBudget = (budgets.data ?? [])
            .map((budget) => ({ budget, health: budgetHealth(budget, txns) }))
            .filter(({ health }) => health.over)
            .map(({ budget, health }) => ({
                id: `budget-${budget.id}`,
                label: budget.name,
                detail: `${formatMoney(health.spent - health.planned)} over plan`,
                kind: "budget",
                badge: { label: "over budget", tone: "warning" as const },
            }));
        const unpaidVendors = (vendors.data ?? [])
            .filter((vendor) => vendor.status !== "paid" && vendor.remaining_amount > 0)
            .map((vendor) => ({
                id: `vendor-${vendor.id}`,
                label: vendor.name,
                detail: `${formatAmount(vendor.remaining_amount)} outstanding`,
                kind: "vendor",
                badge: { label: "unpaid", tone: "warning" as const },
            }));
        return [...overdueTasks, ...overduePayments, ...overBudget, ...unpaidVendors].slice(0, 8);
    }, [tasks.data, payments.data, budgets.data, vendors.data, txns]);

    if (error) return <ErrorState message={(error as Error).message} />;
    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <PanelSkeleton key={index} />
                ))}
            </div>
        );
    }

    const openTasks = (tasks.data ?? [])
        .filter((task) => task.status !== "complete")
        .sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"));
    const recentDone = (tasks.data ?? [])
        .filter((task) => task.status === "complete" && Boolean(task.completed_at))
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
        .slice(0, 3);
    const activeEvents = (events.data ?? []).filter(
        (event) => event.status === "active" || event.status === "planning",
    );
    const today = toISODate(new Date());

    return (
        <>
            <PageHeader title="Dashboard" description="Everything in motion right now, with the money attached." />

            <StatGrid>
                <StatCell
                    label="Total balance"
                    value={formatMoney(totalBalance(accounts.data ?? [], txns))}
                    caption={`${(accounts.data ?? []).length} accounts`}
                    emphasis
                />
                <StatCell label="Income" value={formatMoney(totalIncome(txns))} caption="All recorded income" />
                <StatCell label="Expense" value={formatMoney(totalExpense(txns))} caption="All recorded spend" />
                <StatCell label="Net cash flow" value={formatMoney(netCashFlow(txns))} caption="Income less expense" />
            </StatGrid>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader eyebrow="Today" title="Today's schedule" />
                    <EntryList
                        entries={todayEntries}
                        empty={
                            <EmptyState
                                icon={CalendarDays}
                                eyebrow="Clear day"
                                title="Nothing scheduled today"
                                description="Calendar items, scheduled tasks and payments due today will show here."
                            />
                        }
                    />
                </Panel>

                <Panel>
                    <PanelHeader eyebrow="Next 14 days" title="Upcoming" />
                    <EntryList
                        entries={upcoming}
                        empty={
                            <EmptyState
                                icon={CalendarClock}
                                eyebrow="Quiet ahead"
                                title="Nothing coming up"
                                description="Upcoming events, task deadlines and payment dates will appear here."
                            />
                        }
                    />
                </Panel>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader eyebrow="Attention" title="Alerts" />
                    <EntryList
                        entries={alerts}
                        empty={
                            <EmptyState
                                icon={ListChecks}
                                eyebrow="All clear"
                                title="Nothing needs attention"
                                description="Overdue tasks and payments, over-budget plans and unpaid vendors will surface here."
                            />
                        }
                    />
                </Panel>

                <Panel>
                    <PanelHeader eyebrow="Budget control" title="Budget summary" />
                    {(budgets.data ?? []).length === 0 ? (
                        <EmptyState
                            icon={Target}
                            eyebrow="No budgets"
                            title="Set a budget to track it here"
                            description="General budgets show planned, spent and remaining against real transactions."
                        />
                    ) : (
                        <ul className="divide-y divide-stroke">
                            {(budgets.data ?? []).slice(0, 6).map((budget) => {
                                const health = budgetHealth(budget, txns);
                                return (
                                    <li key={budget.id} className="px-6 py-3.5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-foreground">{budget.name}</p>
                                                <p className="label-mono mt-1">{budget.period}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {health.over ? <StatusBadge tone="danger">over</StatusBadge> : null}
                                                <span className="stat-numeral text-sm">
                                                    {formatMoney(health.spent)} / {formatAmount(budget.planned_amount)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2.5 h-1 w-full rounded-xs bg-beige">
                                            <div
                                                className={
                                                    health.over
                                                        ? "h-full rounded-xs bg-danger"
                                                        : "h-full rounded-xs bg-electric"
                                                }
                                                style={{ width: `${Math.min(health.usage, 100)}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader eyebrow="Operations" title="Active events" />
                    {activeEvents.length === 0 ? (
                        <EmptyState
                            icon={PanelsTopLeft}
                            eyebrow="No events"
                            title="Nothing in flight"
                            description="Planning and active events will appear here with their spend."
                        />
                    ) : (
                        <ul className="divide-y divide-stroke">
                            {activeEvents.slice(0, 6).map((event) => (
                                <li key={event.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-foreground">{event.name}</p>
                                        <p className="label-mono mt-1">
                                            {formatDate(event.start_date)} ·{" "}
                                            {formatMoney(eventFinance(event, txns, []).actualExpense)} spent
                                        </p>
                                    </div>
                                    <StatusBadge tone={eventTone[event.status] ?? "neutral"}>
                                        {event.status}
                                    </StatusBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel>
                    <PanelHeader eyebrow="Execution" title="Open tasks" />
                    {openTasks.length === 0 ? (
                        <EmptyState
                            icon={ListChecks}
                            eyebrow="All clear"
                            title="No open tasks"
                            description="Tasks you create will appear here until they're complete."
                        />
                    ) : (
                        <ul className="divide-y divide-stroke">
                            {openTasks.slice(0, 6).map((task) => {
                                const overdue = Boolean(task.due_date) && (task.due_date as string) < today;
                                return (
                                    <li key={task.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-foreground">{task.title}</p>
                                            <p className={`label-mono mt-1 ${overdue ? "text-danger" : ""}`}>
                                                {task.due_date ? `due ${formatDate(task.due_date)}` : "no due date"}
                                                {task.priority === "high" ? " · high priority" : ""}
                                            </p>
                                        </div>
                                        <StatusBadge tone={taskTone[task.status] ?? "neutral"}>
                                            {task.status}
                                        </StatusBadge>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {recentDone.length > 0 ? (
                        <div className="border-t border-stroke">
                            <p className="label-mono px-6 pt-4">Recently completed</p>
                            <ul className="divide-y divide-stroke">
                                {recentDone.map((task) => (
                                    <li key={task.id} className="flex items-center justify-between gap-4 px-6 py-2.5">
                                        <p className="truncate text-sm text-foreground">{task.title}</p>
                                        <span className="shrink-0 font-mono text-xs text-grey">
                                            {formatDayLabel(task.completed_at?.slice(0, 10))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </Panel>
            </div>

            <Panel className="mt-6">
                <PanelHeader eyebrow="Ledger" title="Recent transactions" />
                {txns.length === 0 ? (
                    <EmptyState
                        icon={CalendarDays}
                        eyebrow="Empty ledger"
                        title="No transactions yet"
                        description="Record income or expenses to see them flow into balances and budgets."
                    />
                ) : (
                    <PanelBody className="p-0">
                        <ul className="divide-y divide-stroke">
                            {txns.slice(0, 8).map((txn) => (
                                <li key={txn.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-foreground">{txn.description}</p>
                                        <p className="label-mono mt-1">{formatDate(txn.occurred_on)}</p>
                                    </div>
                                    <span
                                        className={
                                            txn.type === "income"
                                                ? "stat-numeral text-sm text-success"
                                                : "stat-numeral text-sm text-foreground"
                                        }
                                    >
                                        {txn.type === "income" ? "+" : "−"}
                                        {formatMoney(txn.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </PanelBody>
                )}
            </Panel>
        </>
    );
}
