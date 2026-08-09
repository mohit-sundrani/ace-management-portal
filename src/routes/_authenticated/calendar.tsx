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
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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
      { title: "Calendar — Operations Console" },
      {
        name: "description",
        content:
          "Month, week, day and agenda views of scheduled items, task due dates and event milestones.",
      },
      { property: "og:title", content: "Calendar — Operations Console" },
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
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New item
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
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
        description="Move it, retitle it or relink it — tasks and events stay put."
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
    </>
  );
}
