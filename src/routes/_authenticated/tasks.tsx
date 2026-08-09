import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { DataTable, type Column } from "@/components/console/data-table";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { RecordDialog, type Field } from "@/components/console/record-dialog";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge, priorityTone } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Operations Console" },
      {
        name: "description",
        content:
          "Track every task by status, priority and due date, linked to the event it serves.",
      },
      { property: "og:title", content: "Tasks — Operations Console" },
      {
        property: "og:description",
        content: "Work queue with priorities, due dates and event links.",
      },
    ],
  }),
  component: TasksPage,
});

type StatusFilter = "all" | "todo" | "ongoing" | "complete";

type TaskStatus = "todo" | "ongoing" | "complete";

/** Clicking a task's status advances it one step around the loop: todo → ongoing → complete → todo. */
const nextStatus = (status: string): TaskStatus =>
  status === "todo" ? "ongoing" : status === "ongoing" ? "complete" : "todo";

const nextStatusLabel: Record<string, string> = {
  todo: "ongoing",
  ongoing: "complete",
  complete: "todo",
};

const statusClickerTone: Record<string, string> = {
  todo: "border-stroke bg-beige text-grey hover:border-grey/40 hover:bg-grey/15",
  ongoing: "border-electric/30 bg-electric/10 text-electric hover:bg-electric/20",
  complete: "border-success/30 bg-success/10 text-success hover:bg-success/20",
};

function TasksPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Row<"tasks"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row<"tasks"> | null>(null);

  const tasks = useCollection("tasks", { orderBy: { column: "due_date" } });
  const events = useCollection("events", { orderBy: { column: "name" } });
  const create = useCreate("tasks", "Task");
  const update = useUpdate("tasks", "Task");
  const remove = useRemove("tasks", "Task");

  const rows = tasks.data ?? [];
  const eventName = (id: string | null) =>
    (events.data ?? []).find((event) => event.id === id)?.name ?? "—";

  const fields: ReadonlyArray<Field> = useMemo(
    () => [
      {
        name: "title",
        label: "Task",
        type: "text",
        required: true,
        placeholder: "Confirm stage rental",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "todo", label: "To do" },
          { value: "ongoing", label: "Ongoing" },
          { value: "complete", label: "Complete" },
        ],
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        required: true,
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
      { name: "due_date", label: "Due date", type: "date" },
      { name: "scheduled_date", label: "Scheduled date", type: "date" },
      { name: "start_time", label: "Start time", type: "time" },
      { name: "end_time", label: "End time", type: "time" },
      {
        name: "event_id",
        label: "Linked event",
        type: "select",
        options: (events.data ?? []).map((event) => ({ value: event.id, label: event.name })),
      },
      { name: "category", label: "Category", type: "text", placeholder: "Logistics" },
      { name: "description", label: "Description", type: "textarea" },
    ],
    [events.data],
  );

  const visible = filter === "all" ? rows : rows.filter((task) => task.status === filter);

  const columns: ReadonlyArray<Column<Row<"tasks">>> = [
    {
      key: "status",
      header: "Status",
      width: "8.5rem",
      cell: (task) => {
        const next = nextStatusLabel[task.status];
        return (
          <button
            type="button"
            title={`${task.status} — click to mark ${next}`}
            aria-label={`${task.title} is ${task.status}. Click to mark ${next}.`}
            onClick={() =>
              update.mutate({
                id: task.id,
                values: {
                  status: nextStatus(task.status),
                  completed_at:
                    nextStatus(task.status) === "complete" ? new Date().toISOString() : null,
                },
              })
            }
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1",
              statusClickerTone[task.status],
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {task.status}
          </button>
        );
      },
    },
    {
      key: "title",
      header: "Task",
      cell: (task) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{task.title}</p>
          <p className="label-mono mt-1">{task.category ?? "general"}</p>
        </div>
      ),
    },
    { key: "event", header: "Event", cell: (task) => eventName(task.event_id) },
    { key: "due", header: "Due", cell: (task) => formatDate(task.due_date) },
    {
      key: "priority",
      header: "Priority",
      cell: (task) => (
        <StatusBadge tone={priorityTone[task.priority] ?? "neutral"}>{task.priority}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (task) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${task.title}`}
            onClick={() => setEditing(task)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${task.title}`}
            onClick={() => setDeleteTarget(task)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (tasks.error) return <ErrorState message={(tasks.error as Error).message} />;

  const count = (status: StatusFilter) =>
    status === "all" ? rows.length : rows.filter((task) => task.status === status).length;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="One queue for everything that needs doing, linked to the events it serves."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New task
          </Button>
        }
      />

      <StatGrid>
        <StatCell label="All tasks" value={count("all")} caption="In workspace" emphasis />
        <StatCell label="To do" value={count("todo")} caption="Not started" />
        <StatCell label="Ongoing" value={count("ongoing")} caption="In progress" />
        <StatCell label="Complete" value={count("complete")} caption="Finished" />
      </StatGrid>

      <Panel className="mt-6">
        <PanelHeader
          eyebrow="Queue"
          title="Task list"
          actions={
            <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="todo">To do</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="complete">Complete</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        {tasks.isLoading ? (
          <RowSkeleton columns={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            eyebrow="Nothing here"
            title="No tasks in this view"
            description="Create a task or switch filters to see the rest of your queue."
            action={<Button onClick={() => setOpen(true)}>New task</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={visible} compact />
        )}
      </Panel>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="New task"
        description="Link it to an event so progress rolls up to that workspace."
        fields={fields}
        initial={{ status: "todo", priority: "medium" }}
        submitLabel="Create task"
        busy={create.isPending}
        onSubmit={(values) => create.mutate(values as never, { onSuccess: () => setOpen(false) })}
      />

      <RecordDialog
        open={Boolean(editing)}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        title="Edit task"
        description="Update the details; status and event link roll up to their workspace."
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
        title={deleteTarget ? `Delete “${deleteTarget.title}”?` : "Delete task"}
        description="This task will be permanently removed from your queue."
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
