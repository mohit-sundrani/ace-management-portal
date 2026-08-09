import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];
export type InsertRow<T extends TableName> = Tables[T]["Insert"];
export type UpdateRow<T extends TableName> = Tables[T]["Update"];

export type Enums = Database["public"]["Enums"];
export type TxnType = Enums["txn_type"];
export type TaskStatus = Enums["task_status"];
export type TaskPriority = Enums["task_priority"];
export type EventStatus = Enums["event_status"];
export type PaymentStatus = Enums["payment_status"];
export type RsvpStatus = Enums["rsvp_status"];
export type AccountType = Enums["account_type"];
export type Recurrence = Enums["recurrence"];
export type BudgetPeriod = Enums["budget_period"];
export type AppRole = Enums["app_role"];

/** Friendly messages — raw backend errors are never surfaced to the user. */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

export const friendly = (action: string, code?: string): string => {
  if (code === "42501" || code === "PGRST301")
    return "You don't have permission to perform this action.";
  if (code === "23505") return "That record already exists.";
  if (code === "23503") return "This record is still linked to something else.";
  return `Unable to ${action}. Please try again.`;
};

type PgError = { code?: string; message?: string } | null;
type PgResult = { data: unknown; error: PgError };

type Builder = PromiseLike<PgResult> & {
  eq: (column: string, value: unknown) => Builder;
  gte: (column: string, value: unknown) => Builder;
  lte: (column: string, value: unknown) => Builder;
  in: (column: string, value: unknown) => Builder;
  ilike: (column: string, value: unknown) => Builder;
  order: (column: string, options: { ascending: boolean }) => Builder;
  limit: (count: number) => Builder;
  select: (columns?: string) => Builder;
  insert: (values: unknown) => Builder;
  update: (values: unknown) => Builder;
  delete: () => Builder;
  single: () => PromiseLike<PgResult>;
  maybeSingle: () => PromiseLike<PgResult>;
};

/** Narrow, local escape hatch: the generated client generics do not support dynamic table names. */
const table_ = (name: TableName): Builder =>
  (supabase as unknown as { from: (n: string) => Builder }).from(name);

type FilterOp = "eq" | "gte" | "lte" | "in" | "ilike";
export type Filter = { column: string; op: FilterOp; value: unknown };

export type ListOptions = {
  filters?: ReadonlyArray<Filter>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
};

export async function listRows<T extends TableName>(
  name: T,
  options: ListOptions = {},
): Promise<Array<Row<T>>> {
  let query = table_(name).select("*");
  for (const filter of options.filters ?? []) {
    query = query[filter.op](filter.column, filter.value);
  }
  if (options.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new DataError(friendly("load this data", error.code));
  return (data ?? []) as Array<Row<T>>;
}

export async function getRow<T extends TableName>(name: T, id: string): Promise<Row<T>> {
  const { data, error } = await table_(name).select("*").eq("id", id).maybeSingle();
  if (error) throw new DataError(friendly("load this record", error.code));
  if (!data) throw new DataError("This record no longer exists.");
  return data as Row<T>;
}

export async function insertRow<T extends TableName>(
  name: T,
  values: InsertRow<T>,
): Promise<Row<T>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new DataError("Your session expired. Please sign in again.");
  const payload = { ...(values as Record<string, unknown>), user_id: auth.user.id };
  const { data, error } = await table_(name).insert(payload).select().single();
  if (error) throw new DataError(friendly("save this record", error.code));
  return data as Row<T>;
}

export async function updateRow<T extends TableName>(
  name: T,
  id: string,
  values: UpdateRow<T>,
): Promise<Row<T>> {
  const { data, error } = await table_(name).update(values).eq("id", id).select().single();
  if (error) throw new DataError(friendly("save your changes", error.code));
  return data as Row<T>;
}

export async function deleteRow<T extends TableName>(name: T, id: string): Promise<void> {
  const { error } = await table_(name).delete().eq("id", id);
  if (error) throw new DataError(friendly("delete this record", error.code));
}

export const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
