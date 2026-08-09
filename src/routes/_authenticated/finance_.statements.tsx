import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Download, FileText, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/console/data-table";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { netCashFlow } from "@/lib/finance";
import { formatMoney, toMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/finance_/statements")({
  head: () => ({
    meta: [
      { title: "Statements — Operations Console" },
      {
        name: "description",
        content: "Per-account statements with a running balance across every ledger entry.",
      },
      { property: "og:title", content: "Statements — Operations Console" },
      { property: "og:description", content: "Running balance statements per account." },
    ],
  }),
  component: StatementsPage,
});

type StatementRow = {
  id: string;
  date: string;
  description: string;
  inflow: number;
  outflow: number;
  balance: number;
};

const ALL = "all";

function StatementsPage() {
  const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
  const transactions = useCollection("transactions", { orderBy: { column: "occurred_on" } });
  const categories = useCollection("categories", { orderBy: { column: "name" } });
  const events = useCollection("events", { orderBy: { column: "name" } });
  const { profile, user } = useAuth();
  const [accountId, setAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [eventId, setEventId] = useState<string>(ALL);

  const list = accounts.data ?? [];
  const selectedId = accountId || list[0]?.id || "";
  const account = list.find((entry) => entry.id === selectedId);
  const txns = transactions.data ?? [];

  const hasActiveFilters = Boolean(
    startDate || endDate || typeFilter !== ALL || categoryId !== ALL || eventId !== ALL,
  );

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTypeFilter(ALL);
    setCategoryId(ALL);
    setEventId(ALL);
  };

  /** Opening balance at the start of the selected period: the account's opening
   * balance plus every earlier transaction on that account. */
  const opening = account
    ? toMinor(account.opening_balance) +
      netCashFlow(
        txns.filter(
          (txn) => txn.account_id === account.id && (!startDate || txn.occurred_on < startDate),
        ),
      )
    : 0;

  const rows = useMemo<ReadonlyArray<StatementRow>>(() => {
    if (!account) return [];
    let balance = opening;
    return txns
      .filter((txn) => txn.account_id === account.id)
      .filter((txn) => (startDate ? txn.occurred_on >= startDate : true))
      .filter((txn) => (endDate ? txn.occurred_on <= endDate : true))
      .filter((txn) => (typeFilter === ALL ? true : txn.type === typeFilter))
      .filter((txn) => (categoryId === ALL ? true : txn.category_id === categoryId))
      .filter((txn) => (eventId === ALL ? true : txn.event_id === eventId))
      .map((txn) => {
        const amount = toMinor(txn.amount);
        const inflow = txn.type === "income" ? amount : 0;
        const outflow = txn.type === "expense" ? amount : 0;
        balance = balance + inflow - outflow;
        return {
          id: txn.id,
          date: txn.occurred_on,
          description: txn.description,
          inflow,
          outflow,
          balance,
        };
      });
  }, [account, txns, opening, startDate, endDate, typeFilter, categoryId, eventId]);

  const totalIn = rows.reduce((acc, row) => acc + row.inflow, 0);
  const totalOut = rows.reduce((acc, row) => acc + row.outflow, 0);
  const closing = opening + totalIn - totalOut;
  const periodLabel =
    startDate || endDate
      ? `${startDate ? formatDate(startDate) : "Earliest"} – ${endDate ? formatDate(endDate) : "Today"}`
      : "From opening balance · ongoing";

  const columns: ReadonlyArray<Column<StatementRow>> = [
    { key: "date", header: "Date", cell: (row) => formatDate(row.date) },
    { key: "description", header: "Description", cell: (row) => row.description },
    {
      key: "inflow",
      header: "In",
      align: "right",
      cell: (row) =>
        row.inflow ? <span className="text-success">{formatMoney(row.inflow)}</span> : "—",
    },
    {
      key: "outflow",
      header: "Out",
      align: "right",
      cell: (row) => (row.outflow ? formatMoney(row.outflow) : "—"),
    },
    { key: "balance", header: "Balance", align: "right", cell: (row) => formatMoney(row.balance) },
  ];

  if (transactions.error) return <ErrorState message={(transactions.error as Error).message} />;

  return (
    <>
      <PageHeader
        title="Statements"
        description="Scope an account to a date range, category, type or event, then export a running-balance statement."
        crumbs={[{ label: "Finance", to: "/finance" }, { label: "Statements" }]}
        actions={
          <div className="flex items-center gap-3 print:hidden">
            <Button disabled={!account} onClick={() => window.print()}>
              <Download className="size-4" aria-hidden />
              Download PDF
            </Button>
          </div>
        }
      />

      <Panel className="print:hidden">
        <PanelHeader
          eyebrow="Scope"
          title="Statement filters"
          actions={
            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters}>
              <RotateCcw className="size-4" aria-hidden />
              Clear
            </Button>
          }
        />
        <PanelBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="statement-account">Account</Label>
            <Select value={selectedId} onValueChange={setAccountId}>
              <SelectTrigger id="statement-account" className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {list.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="statement-from">From</Label>
            <Input
              id="statement-from"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statement-to">To</Label>
            <Input
              id="statement-to"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statement-type">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="statement-type" className="w-full">
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
            <Label htmlFor="statement-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="statement-category" className="w-full">
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
            <Label htmlFor="statement-event">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger id="statement-event" className="w-full">
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
        </PanelBody>
      </Panel>

      {/* Print-only letterhead — becomes the first page of the exported PDF. */}
      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-ink pb-4">
          <div>
            <p className="label-mono">Operations Console</p>
            <p className="mt-1 font-heading text-3xl leading-snug text-foreground">
              Account statement
            </p>
          </div>
          <p className="label-mono">Generated {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-2 pt-4 text-sm">
          <div>
            <p className="label-mono">Account</p>
            <p className="mt-1 font-medium text-foreground">{account?.name ?? "—"}</p>
          </div>
          <div>
            <p className="label-mono">Currency</p>
            <p className="mt-1 font-mono text-foreground">{account?.currency ?? "—"}</p>
          </div>
          <div>
            <p className="label-mono">Holder</p>
            <p className="mt-1 text-foreground">{profile?.display_name ?? user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="label-mono">Period</p>
            <p className="mt-1 text-foreground">{periodLabel}</p>
          </div>
        </div>
      </div>

      <StatGrid className="xl:grid-cols-3 print:hidden">
        <StatCell
          label="Opening"
          value={account ? formatMoney(opening, { currency: account.currency }) : "—"}
          caption={periodLabel}
        />
        <StatCell label="Entries" value={rows.length} caption="Match the filters" />
        <StatCell
          label="Closing"
          value={account ? formatMoney(closing, { currency: account.currency }) : "—"}
          caption="Balance at period end"
          emphasis
        />
      </StatGrid>

      <Panel className="mt-6 print:mt-0">
        <PanelHeader eyebrow="Statement" title={account?.name ?? "No account selected"} />
        {transactions.isLoading ? (
          <RowSkeleton columns={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            eyebrow="Nothing to show"
            title="No entries match these filters"
            description="Try changing the account, date range or filters, or record transactions to build a statement."
          />
        ) : (
          <DataTable columns={columns} rows={rows} compact />
        )}

        {account ? (
          <div className="border-t border-stroke px-6 py-4">
            <p className="label-mono">Summary</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <dt className="label-mono">Opening balance</dt>
                <dd className="stat-numeral mt-1 text-sm">
                  {formatMoney(opening, { currency: account.currency })}
                </dd>
              </div>
              <div>
                <dt className="label-mono">Total in</dt>
                <dd className="stat-numeral mt-1 text-sm text-success">
                  {formatMoney(totalIn, { currency: account.currency })}
                </dd>
              </div>
              <div>
                <dt className="label-mono">Total out</dt>
                <dd className="stat-numeral mt-1 text-sm">
                  {formatMoney(totalOut, { currency: account.currency })}
                </dd>
              </div>
              <div>
                <dt className="label-mono">Net movement</dt>
                <dd className="stat-numeral mt-1 text-sm">
                  {formatMoney(totalIn - totalOut, { currency: account.currency })}
                </dd>
              </div>
              <div>
                <dt className="label-mono">Closing balance</dt>
                <dd className="stat-numeral mt-1 text-sm">
                  {formatMoney(closing, { currency: account.currency })}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Panel>
    </>
  );
}
