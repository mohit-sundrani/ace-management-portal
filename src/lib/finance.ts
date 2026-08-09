import { sumMinor, toMinor, type Minor } from "@/lib/money";
import type { Row } from "@/services/db";

export type Txn = Row<"transactions">;
export type Account = Row<"financial_accounts">;
export type EventRow = Row<"events">;
export type BudgetRow = Row<"budgets">;
export type BudgetItem = Row<"event_budget_items">;

const isIncome = (t: Txn) => t.type === "income";

export const totalIncome = (txns: ReadonlyArray<Txn>): Minor =>
  sumMinor(txns.filter(isIncome).map((t) => t.amount));

export const totalExpense = (txns: ReadonlyArray<Txn>): Minor =>
  sumMinor(txns.filter((t) => !isIncome(t)).map((t) => t.amount));

export const netCashFlow = (txns: ReadonlyArray<Txn>): Minor =>
  totalIncome(txns) - totalExpense(txns);

/** Account balance = opening balance + linked income − linked expenses. */
export const accountBalance = (account: Account, txns: ReadonlyArray<Txn>): Minor => {
  const linked = txns.filter((t) => t.account_id === account.id);
  return toMinor(account.opening_balance) + netCashFlow(linked);
};

export const totalBalance = (accounts: ReadonlyArray<Account>, txns: ReadonlyArray<Txn>): Minor =>
  accounts.reduce((acc, account) => acc + accountBalance(account, txns), 0);

export type EventFinance = {
  plannedIncome: Minor;
  plannedExpense: Minor;
  actualIncome: Minor;
  actualExpense: Minor;
  expectedProfit: Minor;
  actualProfit: Minor;
  incomeVariance: Minor;
  expenseVariance: Minor;
  utilisation: number;
};

export const eventFinance = (
  event: EventRow,
  txns: ReadonlyArray<Txn>,
  items: ReadonlyArray<BudgetItem>,
): EventFinance => {
  const linked = txns.filter((t) => t.event_id === event.id);
  const scopedItems = items.filter((i) => i.event_id === event.id);
  const plannedIncome = sumMinor(
    scopedItems.filter((i) => i.kind === "income").map((i) => i.planned_amount),
  );
  const plannedExpenseItems = sumMinor(
    scopedItems.filter((i) => i.kind === "expense").map((i) => i.planned_amount),
  );
  const plannedExpense = plannedExpenseItems || toMinor(event.planned_budget);
  const actualIncome = totalIncome(linked);
  const actualExpense = totalExpense(linked);

  return {
    plannedIncome,
    plannedExpense,
    actualIncome,
    actualExpense,
    expectedProfit: plannedIncome - plannedExpense,
    actualProfit: actualIncome - actualExpense,
    incomeVariance: actualIncome - plannedIncome,
    expenseVariance: actualExpense - plannedExpense,
    utilisation: plannedExpense === 0 ? 0 : Math.round((actualExpense / plannedExpense) * 100),
  };
};

export type BudgetHealth = {
  spent: Minor;
  planned: Minor;
  remaining: Minor;
  usage: number;
  over: boolean;
};

export const budgetHealth = (budget: BudgetRow, txns: ReadonlyArray<Txn>): BudgetHealth => {
  const spent = sumMinor(
    txns
      .filter(
        (t) =>
          t.type === "expense" &&
          (budget.category_id ? t.category_id === budget.category_id : true) &&
          t.occurred_on >= budget.start_date &&
          t.occurred_on <= budget.end_date,
      )
      .map((t) => t.amount),
  );
  const planned = toMinor(budget.planned_amount);
  return {
    spent,
    planned,
    remaining: planned - spent,
    usage: planned === 0 ? 0 : Math.round((spent / planned) * 100),
    over: spent > planned,
  };
};

/** Running balance ledger for statements, oldest first. */
export const withRunningBalance = (
  txns: ReadonlyArray<Txn>,
  opening: Minor,
): Array<Txn & { balance: Minor }> => {
  let balance = opening;
  return [...txns]
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((txn) => {
      balance += txn.type === "income" ? toMinor(txn.amount) : -toMinor(txn.amount);
      return { ...txn, balance };
    });
};

export const monthlySeries = (
  txns: ReadonlyArray<Txn>,
  year: number,
): Array<{ month: string; income: number; expense: number; net: number }> => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.map((month, index) => {
    const scoped = txns.filter((t) => {
      const date = new Date(t.occurred_on);
      return date.getFullYear() === year && date.getMonth() === index;
    });
    const income = totalIncome(scoped) / 100;
    const expense = totalExpense(scoped) / 100;
    return { month, income, expense, net: income - expense };
  });
};
