import { createFileRoute } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  CalendarExportDialog,
  type CalendarPrintOptions,
} from "@/components/console/calendar-export-dialog";
import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { EmptyState, ErrorState } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate, formatDateLong, timeRange, toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar - ACE Management" },
      {
        name: "description",
        content:
          "Month, week, day and agenda views of scheduled items, task due dates and event milestones.",
      },
      { property: "og:title", content: "Calendar - ACE Management" },
      { property: "og:description", content: "Everything scheduled, in the view you need." },
    ],
  }),
  component: CalendarPage,
});

type View = "month" | "week" | "day" | "agenda";

type Entry = {
  id: string;
  itemId?: string;
  date: string;
  label: string;
  kind: "item" | "task" | "event";
  time?: string | undefined;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const kindTone = { item: "info", task: "warning", event: "success" } as const;

function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [view, setView] = useState<View>("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row<"calendar_items"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row<"calendar_items"> | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState<CalendarPrintOptions | null>(null);

  const items = useCollection("calendar_items", { orderBy: { column: "start_date" } });
  const tasks = useCollection("tasks", { orderBy: { column: "due_date" } });
  const events = useCollection("events", { orderBy: { column: "start_date" } });
  const create = useCreate("calendar_items", "Calendar item");
  const update = useUpdate("calendar_items", "Calendar item");
  const remove = useRemove("calendar_items", "Calendar item");

  const entries = useMemo<ReadonlyArray<Entry>>(() => {
    const fromItems: Array<Entry> = (items.data ?? []).map((item) => ({
      id: `item-${item.id}`,
      itemId: item.id,
      date: item.start_date,
      label: item.title,
      kind: "item",
      time: item.all_day ? undefined : timeRange(item.start_time, item.end_time),
    }));
    const fromTasks: Array<Entry> = (tasks.data ?? [])
      .filter((task) => Boolean(task.scheduled_date ?? task.due_date))
      .map((task) => ({
        id: `task-${task.id}`,
        date: (task.scheduled_date ?? task.due_date) as string,
        label: task.title,
        kind: "task",
      }));
    const fromEvents: Array<Entry> = (events.data ?? []).map((event) => ({
      id: `event-${event.id}`,
      date: event.start_date,
      label: event.name,
      kind: "event",
    }));
    return [...fromItems, ...fromTasks, ...fromEvents];
  }, [items.data, tasks.data, events.data]);

  const byDate = useMemo(() => {
    const map = new Map<string, Array<Entry>>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => {
    if (view === "week") {
      return eachDayOfInterval({
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    });
  }, [cursor, view]);

  const agenda = useMemo(
    () =>
      entries
        .filter((entry) => {
          const horizon = toISODate(addDays(cursor, 30));
          return entry.date >= toISODate(cursor) && entry.date <= horizon;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [entries, cursor],
  );

  const printGroups = useMemo(() => {
    if (!printOptions) return [];
    const selected = entries.filter((entry) => printOptions.selection.has(entry.id));
    const byDate = new Map<string, Array<Entry>>();
    for (const entry of selected) {
      const list = byDate.get(entry.date) ?? [];
      list.push(entry);
      byDate.set(entry.date, list);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries, printOptions]);

  const printCount = printGroups.reduce((acc, [, list]) => acc + list.length, 0);

  const fields: ReadonlyArray<Field> = [
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
      placeholder: "Vendor walkthrough",
    },
    { name: "start_date", label: "Date", type: "date", required: true },
    { name: "start_time", label: "Start time", type: "time" },
    { name: "end_time", label: "End time", type: "time" },
    { name: "all_day", label: "All day", type: "switch" },
    { name: "location", label: "Location", type: "text" },
    {
      name: "event_id",
      label: "Linked event",
      type: "select",
      options: (events.data ?? []).map((event) => ({ value: event.id, label: event.name })),
    },
    { name: "description", label: "Description", type: "textarea" },
  ];

  const activeDay = view === "day" ? toISODate(cursor) : selected;
  const selectedEntries = byDate.get(activeDay) ?? [];
  const dayEntries = byDate.get(toISODate(cursor)) ?? [];

  const shift = (direction: 1 | -1) => {
    setCursor((current) => {
      if (view === "month") return addMonths(current, direction);
      if (view === "week") return addWeeks(current, direction);
      return addDays(current, direction);
    });
  };

  const changeView = (next: View) => {
    setView(next);
    if (next === "day") setCursor(parseISO(selected));
  };

  const openItem = (itemId: string) => {
    const item = (items.data ?? []).find((entry) => entry.id === itemId);
    if (item) setEditing(item);
  };

  const downloadCalendar = (options: CalendarPrintOptions) => {
    setPrintOptions(options);
    setExportOpen(false);
    setTimeout(() => window.print(), 100);
  };

  const heading =
    view === "day"
      ? format(cursor, "EEE dd MMM yyyy")
      : view === "week"
        ? `Week of ${format(cursor, "dd MMM yyyy")}`
        : format(cursor, "MMMM yyyy");

  if (items.error) return <ErrorState message={(items.error as Error).message} />;

  const entryRow = (entry: Entry) => (
    <li key={entry.id} className="flex items-start justify-between gap-3 px-6 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{entry.label}</p>
        {entry.time ? <p className="label-mono mt-1">{entry.time}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StatusBadge tone={kindTone[entry.kind]}>{entry.kind}</StatusBadge>
        {entry.kind === "item" ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${entry.label}`}
              onClick={() => openItem(entry.itemId ?? "")}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${entry.label}`}
              onClick={() =>
                setDeleteTarget((items.data ?? []).find((item) => item.id === entry.itemId) ?? null)
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Scheduled items, task due dates and event milestones, in the view you need."
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(value) => changeView(value as View)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="size-4" aria-hidden />
              Download PDF
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New item
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]",
          printOptions && "print:hidden",
        )}
      >
        <Panel>
          <PanelHeader
            eyebrow={view}
            title={heading}
            actions={
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous period"
                  onClick={() => shift(-1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCursor(startOfMonth(new Date()))}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next period"
                  onClick={() => shift(1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            }
          />
          {view === "day" ? (
            dayEntries.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                eyebrow="Clear day"
                title="Nothing scheduled"
                description="Pick another day, or add an item to this date."
                action={
                  <Button size="sm" onClick={() => setOpen(true)}>
                    Add item
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-stroke">{dayEntries.map(entryRow)}</ul>
            )
          ) : view === "agenda" ? (
            agenda.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                eyebrow="Quiet ahead"
                title="Nothing in the next 30 days"
                description="Scheduled items, task due dates and event milestones will list here."
              />
            ) : (
              <ul className="divide-y divide-stroke">
                {agenda.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(entry.date);
                        setCursor(parseISO(entry.date));
                        setView("day");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-6 py-3.5 text-left transition-colors hover:bg-beige/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{entry.label}</p>
                        <p className="label-mono mt-1">
                          {formatDate(entry.date)}
                          {entry.time ? ` · ${entry.time}` : ""}
                        </p>
                      </div>
                      <StatusBadge tone={kindTone[entry.kind]}>{entry.kind}</StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <PanelBody className="p-0">
              <div className="grid grid-cols-7 border-b border-stroke">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="label-mono px-3 py-2 text-center">
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const iso = toISODate(day);
                  const dayEntriesFor = byDate.get(iso) ?? [];
                  const outside = !isSameMonth(day, cursor);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelected(iso)}
                      className={cn(
                        "min-h-24 border-r border-b border-stroke p-2 text-left transition-colors last:border-r-0 hover:bg-beige/60",
                        view === "week" && "min-h-28",
                        outside && "bg-beige/40 text-grey",
                        selected === iso && "ring-1 ring-electric ring-inset",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs",
                          isToday(day)
                            ? "rounded-xs bg-electric px-1.5 py-0.5 text-white"
                            : "text-grey",
                        )}
                      >
                        {format(day, "dd")}
                      </span>
                      <span className="mt-1.5 block space-y-1">
                        {dayEntriesFor.slice(0, 2).map((entry) => (
                          <span
                            key={entry.id}
                            className={cn(
                              "block truncate rounded-xs border-l-2 px-1.5 py-0.5 text-[0.6875rem]",
                              entry.kind === "event" && "border-success bg-success/10",
                              entry.kind === "task" && "border-warning bg-warning/10",
                              entry.kind === "item" && "border-electric bg-electric/10",
                            )}
                          >
                            {entry.label}
                          </span>
                        ))}
                        {dayEntriesFor.length > 2 ? (
                          <span className="label-mono block">+{dayEntriesFor.length - 2} more</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PanelBody>
          )}
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Selected day" title={formatDateLong(activeDay)} />
          {selectedEntries.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              eyebrow="Clear day"
              title="Nothing scheduled"
              description="Pick another day, or add an item to this date."
              action={
                <Button size="sm" onClick={() => setOpen(true)}>
                  Add item
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-stroke">{selectedEntries.map(entryRow)}</ul>
          )}
        </Panel>
      </div>

      {printOptions ? (
        <div className="hidden print:block">
          <div className="flex items-end justify-between border-b-2 border-ink pb-4">
            <div>
              <p className="label-mono">ACE Management</p>
              <p className="mt-1 font-heading text-3xl leading-snug text-foreground font-bold">
                Calendar
              </p>
            </div>
            <p className="label-mono">Generated {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
          </div>

          {printOptions.headerNote ? (
            <div className="mt-5 rounded-sm border border-stroke bg-beige/60 px-4 py-3">
              <p className="label-mono">Note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {printOptions.headerNote}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-x-12 gap-y-2 text-sm">
            <div>
              <p className="label-mono">Entries</p>
              <p className="mt-1 font-medium text-foreground">{printCount}</p>
            </div>
            <div>
              <p className="label-mono">Dates</p>
              <p className="mt-1 font-medium text-foreground">{printGroups.length}</p>
            </div>
            <div>
              <p className="label-mono">Period</p>
              <p className="mt-1 text-foreground">
                {printOptions.from && printOptions.to
                  ? `${formatDate(printOptions.from)} – ${formatDate(printOptions.to)}`
                  : printGroups.length > 0
                    ? `${formatDate(printGroups[0]?.[0])} – ${formatDate(printGroups[printGroups.length - 1]?.[0])}`
                    : "-"}
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            <span aria-hidden className="absolute bottom-1 left-2 top-1 w-px bg-stroke" />
            {printGroups.map(([date, list]) => (
              <section key={date} className="relative break-inside-avoid pb-6 pl-10">
                <span
                  aria-hidden
                  className="absolute left-2 top-1.5 size-2 -translate-x-1/2 rounded-full border-2 border-electric bg-white"
                />
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-heading text-base font-bold text-foreground">
                    {formatDateLong(date)}
                  </h4>
                  <span className="label-mono">
                    {list.length} {list.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {list.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-8 top-4 size-1.5 -translate-x-1/2 rounded-full bg-electric"
                      />
                      <span
                        aria-hidden
                        className="absolute -left-8 top-[18px] h-px w-8 bg-stroke"
                      />
                      <div className="flex items-center justify-between gap-3 rounded-sm border border-stroke bg-beige/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {entry.label}
                          </p>
                          {entry.time ? (
                            <p className="label-mono mt-0.5">
                              {entry.time} · {entry.kind}
                            </p>
                          ) : (
                            <p className="label-mono mt-0.5">{entry.kind}</p>
                          )}
                        </div>
                        {entry.kind !== "item" ? (
                          <StatusBadge tone={kindTone[entry.kind]}>{entry.kind}</StatusBadge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {printOptions.footerNote ? (
            <div className="mt-8 border-t border-stroke pt-4">
              <p className="whitespace-pre-wrap text-sm text-grey">{printOptions.footerNote}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="New calendar item"
        fields={fields}
        initial={{ start_date: selected, all_day: false }}
        submitLabel="Add to calendar"
        busy={create.isPending}
        onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
      />

      <RecordDialog
        open={Boolean(editing)}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        title="Edit calendar item"
        description="Move it, retitle it or relink it - tasks and events stay put."
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
        title={deleteTarget ? `Delete “${deleteTarget.title}”?` : "Delete calendar item"}
        description="This calendar item will be permanently removed."
        busy={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
          }
        }}
      />

      <CalendarExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        entries={entries}
        onDownload={downloadCalendar}
      />
    </>
  );
}
