import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { budgetHealth } from "@/lib/finance";
import { formatAmount, formatMoney, sumMinor } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/finance_/budgets")({
    head: () => ({
        meta: [
            { title: "Budgets - ACE Management" },
            {
                name: "description",
                content: "Monthly, yearly and custom budgets measured against real spend from the ledger.",
            },
            { property: "og:title", content: "Budgets - ACE Management" },
            { property: "og:description", content: "Plan versus actual, category by category." },
        ],
    }),
    component: BudgetsPage,
});

function BudgetsPage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row<"budgets"> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Row<"budgets"> | null>(null);
    const budgets = useCollection("budgets", { orderBy: { column: "start_date", ascending: false } });
    const categories = useCollection("categories", { orderBy: { column: "name" } });
    const transactions = useCollection("transactions", {});
    const create = useCreate("budgets", "Budget");
    const update = useUpdate("budgets", "Budget");
    const remove = useRemove("budgets", "Budget");

    const rows = budgets.data ?? [];
    const txns = transactions.data ?? [];
    const spentTotal = rows.reduce((acc, budget) => acc + budgetHealth(budget, txns).spent, 0);

    const fields: ReadonlyArray<Field> = [
        {
            name: "name",
            label: "Budget name",
            type: "text",
            required: true,
            placeholder: "Monthly groceries",
        },
        {
            name: "period",
            label: "Period",
            type: "select",
            required: true,
            options: [
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
                { value: "custom", label: "Custom" },
            ],
        },
        { name: "start_date", label: "Start date", type: "date", required: true },
        { name: "end_date", label: "End date", type: "date", required: true },
        { name: "planned_amount", label: "Planned amount", type: "number", required: true },
        {
            name: "category_id",
            label: "Category",
            type: "select",
            options: (categories.data ?? []).map((category) => ({
                value: category.id,
                label: category.name,
            })),
            help: "Leave empty to budget across all categories.",
        },
        { name: "notes", label: "Notes", type: "textarea" },
    ];

    if (budgets.error) return <ErrorState message={(budgets.error as Error).message} />;

    return (
        <>
            <PageHeader
                title="Budgets"
                description="Each budget is measured against real transactions inside its date window."
                crumbs={[{ label: "Finance", to: "/finance" }, { label: "Budgets" }]}
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" aria-hidden />
                        New budget
                    </Button>
                }
            />

            <StatGrid className="xl:grid-cols-3">
                <StatCell
                    label="Planned"
                    value={formatMoney(sumMinor(rows.map((budget) => budget.planned_amount)))}
                    caption={`${rows.length} budgets`}
                    emphasis
                />
                <StatCell label="Spent" value={formatMoney(spentTotal)} caption="Within budget windows" />
                <StatCell
                    label="Over budget"
                    value={rows.filter((budget) => budgetHealth(budget, txns).over).length}
                    caption="Needs attention"
                />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader eyebrow="Control" title="All budgets" />
                {budgets.isLoading ? (
                    <RowSkeleton columns={3} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        eyebrow="No budgets"
                        title="Set your first budget"
                        description="Budgets turn the ledger into a plan you can hold yourself to."
                        action={<Button onClick={() => setOpen(true)}>New budget</Button>}
                    />
                ) : (
                    <ul className="divide-y divide-stroke">
                        {rows.map((budget) => {
                            const health = budgetHealth(budget, txns);
                            const category = (categories.data ?? []).find((entry) => entry.id === budget.category_id);
                            return (
                                <li key={budget.id} className="px-6 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{budget.name}</p>
                                            <p className="label-mono mt-1">
                                                {budget.period} · {formatDate(budget.start_date)} –{" "}
                                                {formatDate(budget.end_date)} · {category?.name ?? "all categories"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge
                                                tone={
                                                    health.over ? "danger" : health.usage > 80 ? "warning" : "success"
                                                }
                                            >
                                                {health.usage}% used
                                            </StatusBadge>
                                            <span className="stat-numeral text-sm">
                                                {formatMoney(health.spent)} / {formatAmount(budget.planned_amount)}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit ${budget.name}`}
                                                    onClick={() => setEditing(budget)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Delete ${budget.name}`}
                                                    onClick={() => setDeleteTarget(budget)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-1.5 w-full rounded-xs bg-beige">
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

            <RecordDialog
                open={open}
                onOpenChange={setOpen}
                title="New budget"
                fields={fields}
                initial={{ period: "monthly" }}
                submitLabel="Create budget"
                busy={create.isPending}
                onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
            />

            <RecordDialog
                open={Boolean(editing)}
                onOpenChange={(next) => {
                    if (!next) setEditing(null);
                }}
                title="Edit budget"
                description="Spend is always measured from real transactions inside the window."
                fields={fields}
                initial={editing}
                submitLabel="Save changes"
                busy={update.isPending}
                onSubmit={(values) => {
                    if (editing) {
                        update.mutate({ id: editing.id, values } as never, {
                            onSuccess: () => setEditing(null),
                        });
                    }
                }}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(next) => {
                    if (!next) setDeleteTarget(null);
                }}
                title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete budget"}
                description="This budget will be permanently removed. Transactions are unaffected."
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
