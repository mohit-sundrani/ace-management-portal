import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
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
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/finance_/recurring")({
  head: () => ({
    meta: [
      { title: "Recurring — Operations Console" },
      {
        name: "description",
        content:
          "Salary, rent, subscriptions and bills as recurring rules, separate from generated transactions.",
      },
      { property: "og:title", content: "Recurring — Operations Console" },
      { property: "og:description", content: "Rules for money that moves on a schedule." },
    ],
  }),
  component: RecurringPage,
});

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const pluralFrequency: Record<string, string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

const frequencyLabel = (frequency: string, interval: number): string => {
  if (interval <= 1) return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  return `Every ${interval} ${pluralFrequency[frequency] ?? frequency}`;
};

function RecurringPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row<"recurring_transactions"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row<"recurring_transactions"> | null>(null);

  const rules = useCollection("recurring_transactions", {
    orderBy: { column: "next_run_on" },
  });
  const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
  const categories = useCollection("categories", { orderBy: { column: "name" } });

  const create = useCreate("recurring_transactions", "Recurring rule");
  const update = useUpdate("recurring_transactions", "Recurring rule");
  const remove = useRemove("recurring_transactions", "Recurring rule");

  const rows = rules.data ?? [];
  const nameOf = <T extends { id: string; name: string }>(
    list: ReadonlyArray<T>,
    id: string | null,
  ) => list.find((entry) => entry.id === id)?.name ?? "—";

  const fields: ReadonlyArray<Field> = useMemo(
    () => [
      {
        name: "name",
        label: "Rule name",
        type: "text",
        required: true,
        placeholder: "Monthly salary",
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
      {
        name: "frequency",
        label: "Frequency",
        type: "select",
        required: true,
        options: frequencyOptions,
      },
      {
        name: "interval_count",
        label: "Every N periods",
        type: "number",
        help: "2 with monthly means every other month.",
      },
      {
        name: "account_id",
        label: "Account",
        type: "select",
        options: (accounts.data ?? []).map((account) => ({
          value: account.id,
          label: account.name,
        })),
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
      { name: "next_run_on", label: "Next run date", type: "date", required: true },
      { name: "end_on", label: "End date", type: "date", help: "Leave empty to run indefinitely." },
      { name: "is_active", label: "Active", type: "switch" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    [accounts.data, categories.data],
  );

  const payload = (values: Record<string, unknown>) => ({
    ...values,
    amount: Number(values["amount"] ?? 0),
    interval_count: Number(values["interval_count"] ?? 1),
  });

  const columns: ReadonlyArray<Column<Row<"recurring_transactions">>> = [
    {
      key: "name",
      header: "Rule",
      cell: (rule) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{rule.name}</p>
          <p className="label-mono mt-1">{nameOf(categories.data ?? [], rule.category_id)}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (rule) => (
        <StatusBadge tone={rule.type === "income" ? "success" : "neutral"}>{rule.type}</StatusBadge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (rule) => formatAmount(rule.amount),
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (rule) => frequencyLabel(rule.frequency, rule.interval_count),
    },
    {
      key: "account",
      header: "Account",
      cell: (rule) => nameOf(accounts.data ?? [], rule.account_id),
    },
    { key: "next", header: "Next run", cell: (rule) => formatDate(rule.next_run_on) },
    {
      key: "status",
      header: "Status",
      cell: (rule) => (
        <StatusBadge tone={rule.is_active ? "success" : "neutral"}>
          {rule.is_active ? "active" : "paused"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (rule) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${rule.name}`}
            onClick={() => setEditing(rule)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${rule.name}`}
            onClick={() => setDeleteTarget(rule)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (rules.error) return <ErrorState message={(rules.error as Error).message} />;

  const active = rows.filter((rule) => rule.is_active);
  const nextRun = active.map((rule) => rule.next_run_on).sort((a, b) => a.localeCompare(b))[0];

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Rules for money that moves on a schedule — the generated transactions stay separate."
        crumbs={[{ label: "Finance", to: "/finance" }, { label: "Recurring" }]}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New rule
          </Button>
        }
      />

      <StatGrid className="xl:grid-cols-3">
        <StatCell
          label="Active rules"
          value={active.length}
          caption="Running on schedule"
          emphasis
        />
        <StatCell label="Paused" value={rows.length - active.length} caption="Kept for later" />
        <StatCell
          label="Next run"
          value={nextRun ? formatDate(nextRun) : "—"}
          caption="Earliest active"
        />
      </StatGrid>

      <Panel className="mt-6">
        <PanelHeader eyebrow="Schedule" title="Recurring rules" />
        {rules.isLoading ? (
          <RowSkeleton columns={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={RefreshCcw}
            eyebrow="No rules"
            title="Set up a recurring rule"
            description="Salary, rent and subscriptions repeat — define them once here."
            action={<Button onClick={() => setOpen(true)}>New rule</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={rows} compact />
        )}
      </Panel>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="New recurring rule"
        description="Rules stay separate from individual generated transactions."
        fields={fields}
        initial={{ type: "expense", frequency: "monthly", interval_count: "1", is_active: true }}
        submitLabel="Create rule"
        busy={create.isPending}
        onSubmit={(values) =>
          create.mutate(payload(values) as never, { onSuccess: () => setOpen(false) })
        }
      />

      <RecordDialog
        open={Boolean(editing)}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        title="Edit recurring rule"
        description="Changing the rule never rewrites transactions already recorded."
        fields={fields}
        initial={editing}
        submitLabel="Save changes"
        busy={update.isPending}
        onSubmit={(values) => {
          if (editing) {
            update.mutate({ id: editing.id, values: payload(values) } as never, {
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
        title={deleteTarget ? `Delete “${deleteTarget.name}”?` : "Delete recurring rule"}
        description="This rule will be permanently removed. Transactions already recorded are unaffected."
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
