import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Shapes, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { totalExpense, totalIncome } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/finance_/categories")({
    head: () => ({
        meta: [
            { title: "Categories - ACE Management" },
            {
                name: "description",
                content: "Income and expense categories that drive budgets, reports and statements.",
            },
            { property: "og:title", content: "Categories - ACE Management" },
            { property: "og:description", content: "The taxonomy behind every report." },
        ],
    }),
    component: CategoriesPage,
});

const fields: ReadonlyArray<Field> = [
    { name: "name", label: "Category name", type: "text", required: true, placeholder: "Venue" },
    {
        name: "kind",
        label: "Applies to",
        type: "select",
        required: true,
        options: [
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
        ],
    },
    {
        name: "color",
        label: "Colour",
        type: "text",
        required: true,
        help: "Hex value, for example #6C3BFF.",
    },
    { name: "is_archived", label: "Archived", type: "switch" },
];

function CategoriesPage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row<"categories"> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Row<"categories"> | null>(null);
    const categories = useCollection("categories", { orderBy: { column: "name" } });
    const transactions = useCollection("transactions", {});
    const create = useCreate("categories", "Category");
    const update = useUpdate("categories", "Category");
    const remove = useRemove("categories", "Category");

    const rows = categories.data ?? [];
    const txns = transactions.data ?? [];

    const columns: ReadonlyArray<Column<Row<"categories">>> = [
        {
            key: "name",
            header: "Category",
            cell: (category) => (
                <span className="flex items-center gap-2.5">
                    <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-foreground">{category.name}</span>
                </span>
            ),
        },
        {
            key: "kind",
            header: "Type",
            cell: (category) => (
                <StatusBadge tone={category.kind === "income" ? "success" : "neutral"}>{category.kind}</StatusBadge>
            ),
        },
        {
            key: "count",
            header: "Transactions",
            align: "right",
            cell: (category) => txns.filter((txn) => txn.category_id === category.id).length,
        },
        {
            key: "volume",
            header: "Volume",
            align: "right",
            cell: (category) => {
                const scoped = txns.filter((txn) => txn.category_id === category.id);
                return formatMoney(category.kind === "income" ? totalIncome(scoped) : totalExpense(scoped));
            },
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (category) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => setEditing(category)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            update.mutate({ id: category.id, values: { is_archived: !category.is_archived } })
                        }
                    >
                        {category.is_archived ? "Restore" : "Archive"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => setDeleteTarget(category)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ),
        },
    ];

    if (categories.error) return <ErrorState message={(categories.error as Error).message} />;

    return (
        <>
            <PageHeader
                title="Categories"
                description="The taxonomy every transaction, budget and report leans on."
                crumbs={[{ label: "Finance", to: "/finance" }, { label: "Categories" }]}
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" aria-hidden />
                        New category
                    </Button>
                }
            />

            <Panel>
                <PanelHeader eyebrow="Taxonomy" title={`${rows.length} categories`} />
                {categories.isLoading ? (
                    <RowSkeleton columns={4} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={Shapes}
                        eyebrow="No categories"
                        title="Create a category"
                        description="Categories make budgets and statements meaningful."
                        action={<Button onClick={() => setOpen(true)}>New category</Button>}
                    />
                ) : (
                    <DataTable columns={columns} rows={rows} compact />
                )}
            </Panel>

            <RecordDialog
                open={open}
                onOpenChange={setOpen}
                title="New category"
                fields={fields}
                initial={{ kind: "expense", color: "#6C3BFF", is_archived: false }}
                submitLabel="Create category"
                busy={create.isPending}
                onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
            />

            <RecordDialog
                open={Boolean(editing)}
                onOpenChange={(next) => {
                    if (!next) setEditing(null);
                }}
                title="Edit category"
                description="Existing transactions keep reporting under this category."
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
                title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete category"}
                description="Transactions recorded under this category keep their history but lose the category link."
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
