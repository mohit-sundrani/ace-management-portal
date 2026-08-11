import { createFileRoute } from "@tanstack/react-router";
import { Plus, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useCreate, useRemove } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { netCashFlow, totalExpense, totalIncome } from "@/lib/finance";
import { formatAmount, formatMoney } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/finance_/transactions")({
    head: () => ({
        meta: [
            { title: "Transactions - ACE Management" },
            {
                name: "description",
                content: "The full ledger: income and expenses with accounts, categories and event links.",
            },
            { property: "og:title", content: "Transactions - ACE Management" },
            { property: "og:description", content: "Every rupee in and out, searchable and linked." },
        ],
    }),
    component: TransactionsPage,
});

const ALL = "all";

type TypeFilter = "all" | "income" | "expense";

function TransactionsPage() {
    const [open, setOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Row<"transactions"> | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL);
    const [accountId, setAccountId] = useState(ALL);
    const [categoryId, setCategoryId] = useState(ALL);
    const [eventId, setEventId] = useState(ALL);
    const [methodId, setMethodId] = useState(ALL);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const transactions = useCollection("transactions", {
        orderBy: { column: "occurred_on", ascending: false },
    });
    const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
    const categories = useCollection("categories", { orderBy: { column: "name" } });
    const methods = useCollection("payment_methods", { orderBy: { column: "name" } });
    const events = useCollection("events", { orderBy: { column: "name" } });

    const create = useCreate("transactions", "Transaction");
    const remove = useRemove("transactions", "Transaction");

    const rows = useMemo(() => transactions.data ?? [], [transactions.data]);
    const nameOf = <T extends { id: string; name: string }>(list: ReadonlyArray<T>, id: string | null) =>
        list.find((entry) => entry.id === id)?.name ?? "-";

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows.filter((txn) => {
            if (
                term &&
                !txn.description.toLowerCase().includes(term) &&
                !(txn.reference ?? "").toLowerCase().includes(term)
            ) {
                return false;
            }
            if (typeFilter !== ALL && txn.type !== typeFilter) return false;
            if (accountId !== ALL && txn.account_id !== accountId) return false;
            if (categoryId !== ALL && txn.category_id !== categoryId) return false;
            if (eventId !== ALL && txn.event_id !== eventId) return false;
            if (methodId !== ALL && txn.payment_method_id !== methodId) return false;
            if (fromDate && txn.occurred_on < fromDate) return false;
            if (toDate && txn.occurred_on > toDate) return false;
            return true;
        });
    }, [rows, search, typeFilter, accountId, categoryId, eventId, methodId, fromDate, toDate]);

    const hasActiveFilters = Boolean(
        search ||
        typeFilter !== ALL ||
        accountId !== ALL ||
        categoryId !== ALL ||
        eventId !== ALL ||
        methodId !== ALL ||
        fromDate ||
        toDate,
    );

    const clearFilters = () => {
        setSearch("");
        setTypeFilter(ALL);
        setAccountId(ALL);
        setCategoryId(ALL);
        setEventId(ALL);
        setMethodId(ALL);
        setFromDate("");
        setToDate("");
    };

    const fields: ReadonlyArray<Field> = [
        {
            name: "description",
            label: "Description",
            type: "text",
            required: true,
            placeholder: "Stage rental deposit",
        },
        {
            name: "type",
            label: "Type",
            type: "select",
            required: true,
            options: [
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
            ],
        },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "occurred_on", label: "Date", type: "date", required: true },
        {
            name: "account_id",
            label: "Account",
            type: "select",
            options: (accounts.data ?? []).map((account) => ({ value: account.id, label: account.name })),
        },
        {
            name: "category_id",
            label: "Category",
            type: "select",
            options: (categories.data ?? []).map((category) => ({
                value: category.id,
                label: category.name,
            })),
        },
        {
            name: "payment_method_id",
            label: "Payment method",
            type: "select",
            options: (methods.data ?? []).map((method) => ({ value: method.id, label: method.name })),
        },
        {
            name: "event_id",
            label: "Linked event",
            type: "select",
            options: (events.data ?? []).map((event) => ({ value: event.id, label: event.name })),
        },
        { name: "reference", label: "Reference", type: "text", placeholder: "INV-2043" },
        { name: "notes", label: "Notes", type: "textarea" },
    ];

    const columns: ReadonlyArray<Column<Row<"transactions">>> = [
        { key: "date", header: "Date", cell: (txn) => formatDate(txn.occurred_on) },
        {
            key: "description",
            header: "Description",
            cell: (txn) => (
                <div className="min-w-0">
                    <p className="truncate text-foreground">{txn.description}</p>
                    <p className="label-mono mt-1">{txn.reference ?? "no reference"}</p>
                </div>
            ),
        },
        {
            key: "account",
            header: "Account",
            cell: (txn) => nameOf(accounts.data ?? [], txn.account_id),
        },
        {
            key: "category",
            header: "Category",
            cell: (txn) => nameOf(categories.data ?? [], txn.category_id),
        },
        {
            key: "event",
            header: "Event",
            cell: (txn) =>
                txn.event_id ? (
                    <StatusBadge tone="info" dot={false}>
                        {nameOf(events.data ?? [], txn.event_id)}
                    </StatusBadge>
                ) : (
                    "-"
                ),
        },
        {
            key: "amount",
            header: "Amount",
            align: "right",
            cell: (txn) => (
                <span className={txn.type === "income" ? "text-success" : undefined}>
                    {txn.type === "income" ? "+" : "−"}
                    {formatAmount(txn.amount)}
                </span>
            ),
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (txn) => (
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${txn.description}`}
                    onClick={() => setDeleteTarget(txn)}
                >
                    <Trash2 className="size-4" />
                </Button>
            ),
        },
    ];

    if (transactions.error) return <ErrorState message={(transactions.error as Error).message} />;

    return (
        <>
            <PageHeader
                title="Transactions"
                description="Every movement of money, attributed to an account, a category and - where relevant - an event."
                crumbs={[{ label: "Finance", to: "/finance" }, { label: "Transactions" }]}
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" aria-hidden />
                        Record transaction
                    </Button>
                }
            />

            <StatGrid className="xl:grid-cols-3">
                <StatCell label="Income" value={formatMoney(totalIncome(rows))} caption="All recorded" emphasis />
                <StatCell label="Expense" value={formatMoney(totalExpense(rows))} caption="All recorded" />
                <StatCell label="Net" value={formatMoney(netCashFlow(rows))} caption="Income less expense" />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader
                    eyebrow="Ledger"
                    title={`${visible.length} entries`}
                    actions={
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search description or reference"
                            className="w-64"
                            aria-label="Search transactions"
                        />
                    }
                />
                <div className="grid gap-3 border-b border-stroke px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="txn-type">Type</Label>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                            <SelectTrigger id="txn-type" className="w-full">
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All types</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-account">Account</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger id="txn-account" className="w-full">
                                <SelectValue placeholder="All accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All accounts</SelectItem>
                                {(accounts.data ?? []).map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-category">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger id="txn-category" className="w-full">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All categories</SelectItem>
                                {(categories.data ?? []).map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-event">Event</Label>
                        <Select value={eventId} onValueChange={setEventId}>
                            <SelectTrigger id="txn-event" className="w-full">
                                <SelectValue placeholder="All events" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All events</SelectItem>
                                {(events.data ?? []).map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-method">Payment method</Label>
                        <Select value={methodId} onValueChange={setMethodId}>
                            <SelectTrigger id="txn-method" className="w-full">
                                <SelectValue placeholder="All methods" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All methods</SelectItem>
                                {(methods.data ?? []).map((method) => (
                                    <SelectItem key={method.id} value={method.id}>
                                        {method.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-from">From</Label>
                        <Input
                            id="txn-from"
                            type="date"
                            value={fromDate}
                            onChange={(event) => setFromDate(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="txn-to">To</Label>
                        <Input
                            id="txn-to"
                            type="date"
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
                            <RotateCcw className="size-4" aria-hidden />
                            Clear
                        </Button>
                    </div>
                </div>
                {transactions.isLoading ? (
                    <RowSkeleton columns={6} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        eyebrow="Empty ledger"
                        title="No transactions found"
                        description="Record income or expenses to see balances, budgets and event costs update."
                        action={<Button onClick={() => setOpen(true)}>Record transaction</Button>}
                    />
                ) : (
                    <DataTable columns={columns} rows={visible} compact />
                )}
            </Panel>

            <RecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Record transaction"
                description="Link it to an event to keep that event's budget honest."
                fields={fields}
                initial={{ type: "expense", occurred_on: new Date().toISOString().slice(0, 10) }}
                submitLabel="Save transaction"
                busy={create.isPending}
                onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(next) => {
                    if (!next) setDeleteTarget(null);
                }}
                title={deleteTarget ? `Delete “${deleteTarget.description}”?` : "Delete transaction"}
                description="This transaction will be permanently removed and every derived figure - balances, budgets, statements - updates to match."
                busy={remove.isPending}
                onConfirm={() => {
                    if (deleteTarget) {
                        remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
                    }
                }}
            />
        </>
    );
}
