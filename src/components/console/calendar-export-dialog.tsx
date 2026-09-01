import { FileDown, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge, type Tone } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CalendarEntry = {
    id: string;
    date: string;
    label: string;
    kind: "item" | "task" | "event" | "meeting";
    time?: string | undefined;
};

export type CalendarPrintOptions = {
    selection: ReadonlySet<string>;
    headerNote: string;
    footerNote: string;
    from?: string;
    to?: string;
};

const KIND_LABEL: Record<CalendarEntry["kind"], string> = {
    item: "Calendar items",
    task: "Tasks",
    event: "Events",
    meeting: "Meetings",
};

const KIND_TONE: Record<CalendarEntry["kind"], Tone> = {
    item: "info",
    task: "warning",
    event: "success",
    meeting: "neutral",
};

export function CalendarExportDialog({
    open,
    onOpenChange,
    entries,
    onDownload,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entries: ReadonlyArray<CalendarEntry>;
    onDownload: (options: CalendarPrintOptions) => void;
}) {
    const [selection, setSelection] = useState<Set<string>>(() => new Set());
    const [headerNote, setHeaderNote] = useState("");
    const [footerNote, setFooterNote] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        if (open) {
            setSelection(new Set(entries.map((entry) => entry.id)));
            setHeaderNote("");
            setFooterNote("");
            setFromDate("");
            setToDate("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const visibleEntries = useMemo(
        () => entries.filter((entry) => (!fromDate || entry.date >= fromDate) && (!toDate || entry.date <= toDate)),
        [entries, fromDate, toDate],
    );

    const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

    const groups = useMemo(
        () =>
            (["item", "task", "event", "meeting"] as const)
                .map((kind) => ({ kind, list: visibleEntries.filter((entry) => entry.kind === kind) }))
                .filter((group) => group.list.length > 0),
        [visibleEntries],
    );

    const selectedCount = selection.size;

    const setRange = (from: string, to: string) => {
        setFromDate(from);
        setToDate(to);
        const visible = entries.filter((entry) => (!from || entry.date >= from) && (!to || entry.date <= to));
        setSelection(new Set(visible.map((entry) => entry.id)));
    };

    const clearRange = () => {
        setFromDate("");
        setToDate("");
        setSelection(new Set(entries.map((entry) => entry.id)));
    };

    const toggle = (id: string) => {
        setSelection((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleGroup = (kind: CalendarEntry["kind"]) => {
        setSelection((current) => {
            const ids = visibleEntries.filter((entry) => entry.kind === kind).map((entry) => entry.id);
            const allSelected = ids.every((id) => current.has(id));
            const next = new Set(current);
            for (const id of ids) {
                if (allSelected) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        setSelection((current) =>
            current.size === visibleEntries.length ? new Set() : new Set(visibleEntries.map((entry) => entry.id)),
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading">Download calendar</DialogTitle>
                    <DialogDescription>
                        Pick which items, tasks, events and meetings to include, then add a header and footer note to
                        the PDF.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="export-header-note">Header note</Label>
                        <Textarea
                            id="export-header-note"
                            rows={2}
                            placeholder="e.g. Operational calendar - August 2026"
                            value={headerNote}
                            onChange={(event) => setHeaderNote(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Date range</Label>
                            {fromDate || toDate ? (
                                <button
                                    type="button"
                                    onClick={clearRange}
                                    className="text-grey hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
                                >
                                    <RotateCcw className="size-3" aria-hidden />
                                    Clear range
                                </button>
                            ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="export-from">From</Label>
                                <Input
                                    id="export-from"
                                    type="date"
                                    value={fromDate}
                                    onChange={(event) => setRange(event.target.value, toDate)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="export-to">To</Label>
                                <Input
                                    id="export-to"
                                    type="date"
                                    value={toDate}
                                    onChange={(event) => setRange(fromDate, event.target.value)}
                                />
                            </div>
                        </div>
                        {rangeInvalid ? (
                            <p className="text-danger text-xs">From must not be later than to.</p>
                        ) : (
                            <p className="text-grey text-xs">Leave both empty to include every date.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Include in download</Label>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-grey hover:text-foreground text-xs font-medium transition-colors"
                            >
                                {selectedCount === visibleEntries.length ? "Deselect all" : "Select all"}
                            </button>
                        </div>
                        <div className="border-stroke rounded-sm border">
                            <div className="border-stroke flex items-center justify-between border-b px-3 py-2">
                                <p className="label-mono">Entries</p>
                                <p className="label-mono">
                                    {selectedCount}/{visibleEntries.length} selected
                                </p>
                            </div>
                            {visibleEntries.length === 0 ? (
                                <p className="text-grey px-4 py-6 text-center text-sm">
                                    {rangeInvalid
                                        ? "The from date is later than the to date - choose a valid range."
                                        : "Nothing is scheduled in this range - widen the dates or add items to the calendar to export them."}
                                </p>
                            ) : (
                                <ScrollArea className="h-56">
                                    <ul className="divide-stroke divide-y">
                                        {groups.map((group) => {
                                            const ids = group.list.map((entry) => entry.id);
                                            const allSelected = ids.every((id) => selection.has(id));
                                            return (
                                                <li key={group.kind}>
                                                    <div className="bg-beige/60 flex items-center gap-2.5 px-3 py-2">
                                                        <Checkbox
                                                            id={`export-group-${group.kind}`}
                                                            checked={allSelected}
                                                            onCheckedChange={() => toggleGroup(group.kind)}
                                                        />
                                                        <Label
                                                            htmlFor={`export-group-${group.kind}`}
                                                            className="label-mono text-foreground"
                                                        >
                                                            {KIND_LABEL[group.kind]}
                                                        </Label>
                                                        <span className="label-mono">{group.list.length}</span>
                                                    </div>
                                                    <ul className="divide-stroke divide-y">
                                                        {group.list.map((entry) => (
                                                            <li
                                                                key={entry.id}
                                                                className="flex items-center justify-between gap-3 py-2 pr-3 pl-4"
                                                            >
                                                                <label
                                                                    htmlFor={`export-entry-${entry.id}`}
                                                                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                                                                >
                                                                    <Checkbox
                                                                        id={`export-entry-${entry.id}`}
                                                                        checked={selection.has(entry.id)}
                                                                        onCheckedChange={() => toggle(entry.id)}
                                                                    />
                                                                    <span className="min-w-0">
                                                                        <span
                                                                            className={cn(
                                                                                "block truncate text-sm",
                                                                                selection.has(entry.id)
                                                                                    ? "text-foreground"
                                                                                    : "text-grey",
                                                                            )}
                                                                        >
                                                                            {entry.label}
                                                                        </span>
                                                                        {entry.time ? (
                                                                            <span className="label-mono mt-0.5 block">
                                                                                {entry.time}
                                                                            </span>
                                                                        ) : null}
                                                                    </span>
                                                                </label>
                                                                <StatusBadge tone={KIND_TONE[entry.kind]} dot={false}>
                                                                    {entry.kind}
                                                                </StatusBadge>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="export-footer-note">Footer note</Label>
                        <Textarea
                            id="export-footer-note"
                            rows={2}
                            placeholder="e.g. Prepared by the operations team"
                            value={footerNote}
                            onChange={(event) => setFooterNote(event.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={selectedCount === 0 || rangeInvalid}
                        onClick={() => onDownload({ selection, headerNote, footerNote, from: fromDate, to: toDate })}
                    >
                        <FileDown className="size-4" aria-hidden />
                        Download PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
