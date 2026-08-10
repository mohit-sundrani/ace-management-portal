import { Download, FileDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CalendarEntry = {
  id: string;
  date: string;
  label: string;
  kind: "item" | "task" | "event";
  time?: string | undefined;
};

export type CalendarPrintOptions = {
  selection: ReadonlySet<string>;
  headerNote: string;
  footerNote: string;
};

const KIND_LABEL: Record<CalendarEntry["kind"], string> = {
  item: "Calendar items",
  task: "Tasks",
  event: "Events",
};

const KIND_TONE: Record<CalendarEntry["kind"], Tone> = {
  item: "info",
  task: "warning",
  event: "success",
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

  useEffect(() => {
    if (open) {
      setSelection(new Set(entries.map((entry) => entry.id)));
      setHeaderNote("");
      setFooterNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(
    () =>
      (["item", "task", "event"] as const)
        .map((kind) => ({ kind, list: entries.filter((entry) => entry.kind === kind) }))
        .filter((group) => group.list.length > 0),
    [entries],
  );

  const selectedCount = selection.size;

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
      const ids = entries.filter((entry) => entry.kind === kind).map((entry) => entry.id);
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
      current.size === entries.length ? new Set() : new Set(entries.map((entry) => entry.id)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Download calendar</DialogTitle>
          <DialogDescription>
            Pick which items, tasks and events to include, then add a header and footer note to the
            PDF.
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
              <Label>Include in download</Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-grey transition-colors hover:text-foreground"
              >
                {selectedCount === entries.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="rounded-sm border border-stroke">
              <div className="flex items-center justify-between border-b border-stroke px-3 py-2">
                <p className="label-mono">Entries</p>
                <p className="label-mono">
                  {selectedCount}/{entries.length} selected
                </p>
              </div>
              {entries.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-grey">
                  Nothing is scheduled yet - add items to the calendar to export them.
                </p>
              ) : (
                <ScrollArea className="h-56">
                  <ul className="divide-y divide-stroke">
                    {groups.map((group) => {
                      const ids = group.list.map((entry) => entry.id);
                      const allSelected = ids.every((id) => selection.has(id));
                      return (
                        <li key={group.kind}>
                          <div className="flex items-center gap-2.5 bg-beige/60 px-3 py-2">
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
                          <ul className="divide-y divide-stroke">
                            {group.list.map((entry) => (
                              <li
                                key={entry.id}
                                className="flex items-center justify-between gap-3 py-2 pl-4 pr-3"
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
                                        selection.has(entry.id) ? "text-foreground" : "text-grey",
                                      )}
                                    >
                                      {entry.label}
                                    </span>
                                    {entry.time ? (
                                      <span className="label-mono mt-0.5 block">{entry.time}</span>
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
            disabled={selectedCount === 0}
            onClick={() => onDownload({ selection, headerNote, footerNote })}
          >
            <FileDown className="size-4" aria-hidden />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
