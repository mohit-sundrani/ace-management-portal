import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { accountBalance, totalBalance } from "@/lib/finance";
import { formatAmount, formatMoney } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/finance_/accounts")({
    head: () => ({
        meta: [
            { title: "Accounts - ACE Management" },
            {
                name: "description",
                content: "Cash, bank, savings and card accounts with live balances derived from the ledger.",
            },
            { property: "og:title", content: "Accounts - ACE Management" },
            { property: "og:description", content: "Live balances across every account you hold." },
        ],
    }),
    component: AccountsPage,
});

const fields: ReadonlyArray<Field> = [
    {
        name: "name",
        label: "Account name",
        type: "text",
        required: true,
        placeholder: "Primary bank",
    },
    {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
            { value: "cash", label: "Cash" },
            { value: "bank", label: "Bank" },
            { value: "savings", label: "Savings" },
            { value: "wallet", label: "Wallet" },
            { value: "credit_card", label: "Credit card" },
            { value: "other", label: "Other" },
        ],
    },
    { name: "opening_balance", label: "Opening balance", type: "number", required: true },
    {
        name: "currency",
        label: "Currency",
        type: "text",
        required: true,
        help: "ISO code, for example INR.",
    },
    { name: "is_active", label: "Active", type: "switch" },
    { name: "description", label: "Description", type: "textarea" },
];

function AccountsPage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row<"financial_accounts"> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Row<"financial_accounts"> | null>(null);
    const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
    const transactions = useCollection("transactions", {});
    const create = useCreate("financial_accounts", "Account");
    const update = useUpdate("financial_accounts", "Account");
    const remove = useRemove("financial_accounts", "Account");

    const rows = accounts.data ?? [];
    const txns = transactions.data ?? [];

    const columns: ReadonlyArray<Column<Row<"financial_accounts">>> = [
        {
            key: "name",
            header: "Account",
            cell: (account) => (
                <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">{account.name}</p>
                    <p className="label-mono mt-1">{account.currency}</p>
                </div>
            ),
        },
        { key: "type", header: "Type", cell: (account) => account.type.replace("_", " ") },
        {
            key: "status",
            header: "Status",
            cell: (account) => (
                <StatusBadge tone={account.is_active ? "success" : "neutral"}>
                    {account.is_active ? "active" : "archived"}
                </StatusBadge>
            ),
        },
        {
            key: "opening",
            header: "Opening",
            align: "right",
            cell: (account) => formatAmount(account.opening_balance, { currency: account.currency }),
        },
        {
            key: "balance",
            header: "Balance",
            align: "right",
            cell: (account) => formatMoney(accountBalance(account, txns), { currency: account.currency }),
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (account) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${account.name}`}
                        onClick={() => setEditing(account)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${account.name}`}
                        onClick={() => setDeleteTarget(account)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ),
        },
    ];

    if (accounts.error) return <ErrorState message={(accounts.error as Error).message} />;

    return (
        <>
            <PageHeader
                title="Accounts"
                description="Balances are derived: opening balance plus every linked transaction."
                crumbs={[{ label: "Finance", to: "/finance" }, { label: "Accounts" }]}
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" aria-hidden />
                        New account
                    </Button>
                }
            />

            <StatGrid className="xl:grid-cols-3">
                <StatCell
                    label="Total balance"
                    value={formatMoney(totalBalance(rows, txns))}
                    caption="All accounts"
                    emphasis
                />
                <StatCell label="Accounts" value={rows.length} caption="In workspace" />
                <StatCell
                    label="Active"
                    value={rows.filter((account) => account.is_active).length}
                    caption="Currently in use"
                />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader eyebrow="Holdings" title="All accounts" />
                {accounts.isLoading ? (
                    <RowSkeleton columns={5} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        eyebrow="No accounts"
                        title="Add your first account"
                        description="Accounts give every transaction a home and keep balances accurate."
                        action={<Button onClick={() => setOpen(true)}>New account</Button>}
                    />
                ) : (
                    <DataTable columns={columns} rows={rows} />
                )}
            </Panel>

            <RecordDialog
                open={open}
                onOpenChange={setOpen}
                title="New account"
                fields={fields}
                initial={{ type: "bank", currency: "INR", is_active: true, opening_balance: "0" }}
                submitLabel="Create account"
                busy={create.isPending}
                onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
            />

            <RecordDialog
                open={Boolean(editing)}
                onOpenChange={(next) => {
                    if (!next) setEditing(null);
                }}
                title="Edit account"
                description="Balances stay derived - changing the opening balance re-bases every figure."
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
                title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete account"}
                description="Transactions on this account keep their history but lose the account link."
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
