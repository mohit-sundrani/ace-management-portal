import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Column<T> = {
    key: string;
    header: string;
    align?: "left" | "right";
    width?: string;
    cell: (row: T) => ReactNode;
};

/** Hairline data table. Numeric columns are right aligned per the design system. */
export function DataTable<T extends { id: string }>({
    columns,
    rows,
    compact = false,
    onRowClick,
    emptyLabel = "No records",
}: {
    columns: ReadonlyArray<Column<T>>;
    rows: ReadonlyArray<T>;
    compact?: boolean;
    onRowClick?: (row: T) => void;
    emptyLabel?: string;
}) {
    if (rows.length === 0) {
        return <p className="px-6 py-10 text-center text-sm text-grey">{emptyLabel}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-stroke">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                style={column.width ? { width: column.width } : undefined}
                                className={cn(
                                    "label-mono px-6 py-3 text-left font-normal",
                                    column.align === "right" && "text-right",
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                    {rows.map((row) => (
                        <tr
                            key={row.id}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={cn("transition-colors hover:bg-beige/60", onRowClick && "cursor-pointer")}
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={cn(
                                        "px-6 align-middle text-foreground",
                                        compact ? "py-2.5" : "py-3.5",
                                        column.align === "right" && "stat-numeral text-right",
                                    )}
                                >
                                    {column.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
