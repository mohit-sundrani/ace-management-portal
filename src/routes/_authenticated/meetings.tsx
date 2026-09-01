import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Pencil, Plus, Trash2, Video, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { DeleteConfirmDialog } from "@/components/console/delete-dialog";
import { DataTable, type Column } from "@/components/console/data-table";
import { MeetingDialog } from "@/components/console/meeting-dialog";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelHeader } from "@/components/console/panel";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useCreate, useRemove, useUpdate } from "@/hooks/use-collection";
import { formatDate, formatTime } from "@/lib/dates";
import type { MeetingMode, Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/meetings")({
    head: () => ({
        meta: [
            { title: "Meetings - ACE Management" },
            {
                name: "description",
                content: "Plan meetings with a date, time, mode and agenda points - they appear on the calendar.",
            },
            { property: "og:title", content: "Meetings - ACE Management" },
            {
                property: "og:description",
                content: "Every meeting, its mode and agenda - listed and visible on the calendar.",
            },
        ],
    }),
    component: MeetingsPage,
});

type ModeFilter = "all" | MeetingMode;

const modeTone: Record<MeetingMode, "info" | "neutral"> = { online: "info", offline: "neutral" };

function MeetingsPage() {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<ModeFilter>("all");
    const [editing, setEditing] = useState<Row<"meetings"> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Row<"meetings"> | null>(null);

    const meetings = useCollection("meetings", { orderBy: { column: "date" } });
    const create = useCreate("meetings", "Meeting");
    const update = useUpdate("meetings", "Meeting");
    const remove = useRemove("meetings", "Meeting");

    const rows = meetings.data ?? [];

    const pointsOf = (meeting: Row<"meetings">): string[] => {
        const raw = Array.isArray(meeting.points) ? (meeting.points as unknown[]) : [];
        return raw.map((point) => String(point)).filter(Boolean);
    };

    const modeIcon = (mode: MeetingMode) =>
        mode === "offline" ? <Users className="size-3" aria-hidden /> : <Video className="size-3" aria-hidden />;

    const columns: ReadonlyArray<Column<Row<"meetings">>> = [
        {
            key: "title",
            header: "Meeting",
            cell: (meeting) => (
                <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">{meeting.title}</p>
                    {meeting.notes ? <p className="text-grey mt-1 line-clamp-1 text-xs">{meeting.notes}</p> : null}
                </div>
            ),
        },
        {
            key: "date",
            header: "Date",
            cell: (meeting) => (
                <div className="min-w-0">
                    <p>{formatDate(meeting.date)}</p>
                    <p className="label-mono mt-1">{meeting.time ? formatTime(meeting.time) : "All day"}</p>
                </div>
            ),
        },
        {
            key: "mode",
            header: "Mode",
            cell: (meeting) => (
                <StatusBadge tone={modeTone[meeting.mode]}>
                    {modeIcon(meeting.mode)}
                    {meeting.mode}
                </StatusBadge>
            ),
        },
        {
            key: "points",
            header: "Agenda",
            cell: (meeting) => {
                const points = pointsOf(meeting);
                if (points.length === 0) return <span className="text-grey text-xs">No points</span>;
                return (
                    <ol className="space-y-0.5">
                        {points.map((point, index) => (
                            <li key={index} className="text-grey flex gap-2 text-xs">
                                <span className="label-mono shrink-0">{index + 1}.</span>
                                <span className="min-w-0 truncate">{point}</span>
                            </li>
                        ))}
                    </ol>
                );
            },
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (meeting) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${meeting.title}`}
                        onClick={() => setEditing(meeting)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${meeting.title}`}
                        onClick={() => setDeleteTarget(meeting)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const visible = filter === "all" ? rows : rows.filter((meeting) => meeting.mode === filter);

    if (meetings.error) return <ErrorState message={(meetings.error as Error).message} />;

    const count = (mode: ModeFilter) =>
        mode === "all" ? rows.length : rows.filter((meeting) => meeting.mode === mode).length;

    return (
        <>
            <PageHeader
                title="Meetings"
                description="Plan meetings with a date, time and mode. They show up on the calendar on their date."
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="size-4" aria-hidden />
                        New meeting
                    </Button>
                }
            />

            <StatGrid>
                <StatCell label="Total meetings" value={count("all")} caption="On your calendar" emphasis />
                <StatCell label="Online" value={count("online")} caption="Virtual syncs" />
                <StatCell label="Offline" value={count("offline")} caption="In-person" />
                <StatCell
                    label="Upcoming"
                    value={rows.filter((meeting) => meeting.date >= formatISODate(new Date())).length}
                    caption="Today and later"
                />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader
                    eyebrow="Meetings"
                    title="Meeting list"
                    actions={
                        <Tabs value={filter} onValueChange={(value) => setFilter(value as ModeFilter)}>
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="online">Online</TabsTrigger>
                                <TabsTrigger value="offline">Offline</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    }
                />
                {meetings.isLoading ? (
                    <RowSkeleton columns={4} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        eyebrow="Nothing here"
                        title="No meetings in this view"
                        description="Create a meeting or switch filters to see the rest of your agenda."
                        action={<Button onClick={() => setOpen(true)}>New meeting</Button>}
                    />
                ) : (
                    <DataTable columns={columns} rows={visible} compact />
                )}
            </Panel>

            <MeetingDialog
                open={open}
                onOpenChange={setOpen}
                title="New meeting"
                description="Set the date, time and mode, then list the agenda points."
                submitLabel="Add meeting"
                busy={create.isPending}
                onSubmit={(values) =>
                    create.mutate(
                        {
                            title: values.title,
                            date: values.date,
                            mode: values.mode,
                            points: values.points,
                            time: values.time || null,
                            notes: values.notes || null,
                        } as never,
                        { onSuccess: () => setOpen(false) },
                    )
                }
            />

            <MeetingDialog
                open={Boolean(editing)}
                onOpenChange={(next) => {
                    if (!next) setEditing(null);
                }}
                title="Edit meeting"
                description="Update the agenda, shift the time, or change the mode."
                initial={editing}
                submitLabel="Save changes"
                busy={update.isPending}
                onSubmit={(values) => {
                    if (editing) {
                        update.mutate(
                            {
                                id: editing.id,
                                values: {
                                    title: values.title,
                                    date: values.date,
                                    mode: values.mode,
                                    points: values.points,
                                    time: values.time || null,
                                    notes: values.notes || null,
                                },
                            } as never,
                            { onSuccess: () => setEditing(null) },
                        );
                    }
                }}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(next) => {
                    if (!next) setDeleteTarget(null);
                }}
                title={deleteTarget ? `Delete “${deleteTarget.title}”?` : "Delete meeting"}
                description="This meeting and its agenda points will be permanently removed from the calendar."
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

const formatISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
