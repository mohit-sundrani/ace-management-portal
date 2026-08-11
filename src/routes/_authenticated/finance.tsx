import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { StatCell, StatGrid } from "@/components/console/stat";
import { ErrorState, PanelSkeleton } from "@/components/console/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import {
    accountBalance,
    budgetHealth,
    monthlySeries,
    netCashFlow,
    totalBalance,
    totalExpense,
    totalIncome,
} from "@/lib/finance";
import { formatAmount, formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/finance")({
    head: () => ({
        meta: [
            { title: "Finance overview - ACE Management" },
            {
                name: "description",
                content: "Balances, cash flow by month, budget health and the latest ledger entries.",
            },
            { property: "og:title", content: "Finance overview - ACE Management" },
            {
                property: "og:description",
                content: "The money pillar: balances, flow and budget health.",
            },
        ],
    }),
    component: FinanceOverview,
});

function FinanceOverview() {
    const accounts = useCollection("financial_accounts", { orderBy: { column: "name" } });
    const transactions = useCollection("transactions", {
        orderBy: { column: "occurred_on", ascending: false },
    });
    const budgets = useCollection("budgets", { orderBy: { column: "start_date", ascending: false } });

    const txns = useMemo(() => transactions.data ?? [], [transactions.data]);
    const [year, setYear] = useState(() => new Date().getFullYear());
    const years = useMemo(() => {
        const found = new Set<number>();
        for (const txn of txns) found.add(new Date(txn.occurred_on).getFullYear());
        if (found.size === 0) return [new Date().getFullYear()];
        return Array.from(found).sort((a, b) => b - a);
    }, [txns]);
    const series = useMemo(() => monthlySeries(txns, year), [txns, year]);

    if (transactions.error) return <ErrorState message={(transactions.error as Error).message} />;
    if (transactions.isLoading) return <PanelSkeleton />;

    return (
        <>
            <PageHeader
                title="Finance"
                description="Balances, cash flow and budget health across the whole workspace."
            />

            <StatGrid>
                <StatCell
                    label="Total balance"
                    value={formatMoney(totalBalance(accounts.data ?? [], txns))}
                    caption={`${(accounts.data ?? []).length} accounts`}
                    emphasis
                />
                <StatCell label="Income" value={formatMoney(totalIncome(txns))} caption="All recorded income" />
                <StatCell label="Expense" value={formatMoney(totalExpense(txns))} caption="All recorded spend" />
                <StatCell label="Net" value={formatMoney(netCashFlow(txns))} caption="Income less expense" />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader
                    eyebrow="Cash flow"
                    title={`Monthly flow · ${year}`}
                    actions={
                        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                            <SelectTrigger className="w-28" aria-label="Select year">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((entry) => (
                                    <SelectItem key={entry} value={String(entry)}>
                                        {entry}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
                <PanelBody>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                                <CartesianGrid stroke="var(--color-stroke)" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "var(--color-grey)" }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={64}
                                    tick={{ fontSize: 11, fill: "var(--color-grey)" }}
                                />
                                <Tooltip
                                    cursor={{ fill: "var(--color-beige)" }}
                                    contentStyle={{
                                        borderRadius: 4,
                                        border: "1px solid var(--color-stroke)",
                                        fontSize: 12,
                                    }}
                                />
                                <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[2, 2, 0, 0]} />
                                <Bar
                                    dataKey="expense"
                                    name="Expense"
                                    fill="var(--color-electric)"
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PanelBody>
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader
                        eyebrow="Accounts"
                        title="Balances"
                        actions={
                            <Link
                                to="/finance/accounts"
                                className="text-electric font-mono text-xs uppercase hover:underline"
                            >
                                Manage
                            </Link>
                        }
                    />
                    <ul className="divide-stroke divide-y">
                        {(accounts.data ?? []).map((account) => (
                            <li key={account.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                                <div className="min-w-0">
                                    <p className="text-foreground truncate text-sm">{account.name}</p>
                                    <p className="label-mono mt-1">{account.type}</p>
                                </div>
                                <span className="stat-numeral text-sm">
                                    {formatMoney(accountBalance(account, txns), { currency: account.currency })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>

                <Panel>
                    <PanelHeader
                        eyebrow="Control"
                        title="Budget health"
                        actions={
                            <Link
                                to="/finance/budgets"
                                className="text-electric font-mono text-xs uppercase hover:underline"
                            >
                                Manage
                            </Link>
                        }
                    />
                    <ul className="divide-stroke divide-y">
                        {(budgets.data ?? []).slice(0, 6).map((budget) => {
                            const health = budgetHealth(budget, txns);
                            return (
                                <li key={budget.id} className="px-6 py-3.5">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-foreground truncate text-sm">{budget.name}</p>
                                        <span className="stat-numeral text-sm">
                                            {formatMoney(health.spent)} / {formatAmount(budget.planned_amount)}
                                        </span>
                                    </div>
                                    <div className="bg-beige mt-2 h-1.5 w-full rounded-xs">
                                        <div
                                            className={
                                                health.over
                                                    ? "bg-danger h-full rounded-xs"
                                                    : "bg-electric h-full rounded-xs"
                                            }
                                            style={{ width: `${Math.min(health.usage, 100)}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            </div>

            <Panel className="mt-6">
                <PanelHeader
                    eyebrow="Ledger"
                    title="Latest transactions"
                    actions={
                        <Link
                            to="/finance/transactions"
                            className="text-electric font-mono text-xs uppercase hover:underline"
                        >
                            View all
                        </Link>
                    }
                />
                <ul className="divide-stroke divide-y">
                    {txns.slice(0, 8).map((txn) => (
                        <li key={txn.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                            <div className="min-w-0">
                                <p className="text-foreground truncate text-sm">{txn.description}</p>
                                <p className="label-mono mt-1">{formatDate(txn.occurred_on)}</p>
                            </div>
                            <span
                                className={
                                    txn.type === "income" ? "stat-numeral text-success text-sm" : "stat-numeral text-sm"
                                }
                            >
                                {txn.type === "income" ? "+" : "−"}
                                {formatAmount(txn.amount)}
                            </span>
                        </li>
                    ))}
                </ul>
            </Panel>
        </>
    );
}
