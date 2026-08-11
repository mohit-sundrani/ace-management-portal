import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
    deleteRow,
    insertRow,
    listRows,
    messageFor,
    updateRow,
    type InsertRow,
    type ListOptions,
    type Row,
    type TableName,
    type UpdateRow,
} from "@/services/db";

export const collectionKey = (table: TableName, scope: unknown = null) => [table, scope] as const;

export function useCollection<T extends TableName>(table: T, options: ListOptions = {}, scope: unknown = null) {
    return useQuery({
        queryKey: collectionKey(table, scope ?? options),
        queryFn: () => listRows(table, options),
        staleTime: 30_000,
    });
}

/** Invalidates every collection so cross-entity views (dashboard, event workspace) stay truthful. */
const invalidateAll = (client: ReturnType<typeof useQueryClient>) => {
    void client.invalidateQueries();
};

export function useCreate<T extends TableName>(table: T, label: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (values: InsertRow<T>) => insertRow(table, values),
        onSuccess: () => {
            invalidateAll(client);
            toast.success(`${label} created`);
        },
        onError: (error) => toast.error(messageFor(error)),
    });
}

export function useUpdate<T extends TableName>(table: T, label: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ id, values }: { id: string; values: UpdateRow<T> }) => updateRow(table, id, values),
        onSuccess: () => {
            invalidateAll(client);
            toast.success(`${label} updated`);
        },
        onError: (error) => toast.error(messageFor(error)),
    });
}

export function useRemove<T extends TableName>(table: T, label: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteRow(table, id),
        onSuccess: () => {
            invalidateAll(client);
            toast.success(`${label} deleted`);
        },
        onError: (error) => toast.error(messageFor(error)),
    });
}

export type CollectionRow<T extends TableName> = Row<T>;
