import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MeetingMode } from "@/services/db";

export type MeetingFormValues = {
    title: string;
    date: string;
    time: string;
    mode: MeetingMode;
    points: string[];
    notes: string;
};

const EMPTY: MeetingFormValues = { title: "", date: "", time: "", mode: "online", points: [""], notes: "" };

export function buildMeetingValues(source?: Record<string, unknown> | null): MeetingFormValues {
    if (!source) return EMPTY;
    const rawPoints = Array.isArray(source["points"]) ? (source["points"] as unknown[]) : [];
    const points = rawPoints.map((point) => String(point ?? ""));
    return {
        title: String(source["title"] ?? ""),
        date: String(source["date"] ?? ""),
        time: String(source["time"] ?? "") || "",
        mode: ((source["mode"] as MeetingMode | null | undefined) ?? "online") as MeetingMode,
        points: points.length > 0 ? points : [""],
        notes: String(source["notes"] ?? "") || "",
    };
}

export function MeetingDialog({
    open,
    onOpenChange,
    title,
    description,
    initial,
    submitLabel = "Save",
    busy = false,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    initial?: Record<string, unknown> | null;
    submitLabel?: string;
    busy?: boolean;
    onSubmit: (values: MeetingFormValues) => void;
}) {
    const [values, setValues] = useState<MeetingFormValues>(() => buildMeetingValues(initial));

    useEffect(() => {
        if (open) setValues(buildMeetingValues(initial));
    }, [open, initial]);

    const set = <K extends keyof MeetingFormValues>(key: K, value: MeetingFormValues[K]) =>
        setValues((current) => ({ ...current, [key]: value }));

    const updatePoint = (index: number, value: string) =>
        setValues((current) => {
            const points = [...current.points];
            points[index] = value;
            return { ...current, points };
        });

    const addPoint = () => setValues((current) => ({ ...current, points: [...current.points, ""] }));

    const removePoint = (index: number) =>
        setValues((current) => {
            const points = current.points.filter((_, i) => i !== index);
            return { ...current, points: points.length > 0 ? points : [""] };
        });

    const cleanPoints = values.points.map((point) => point.trim()).filter(Boolean);
    const canSubmit = Boolean(values.title.trim()) && Boolean(values.date) && !busy;

    const submit = () => {
        onSubmit({
            title: values.title.trim(),
            date: values.date,
            time: values.time || "",
            mode: values.mode,
            points: cleanPoints,
            notes: values.notes,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading">{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>

                <form
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="meeting-title">
                            Title <span className="text-danger">*</span>
                        </Label>
                        <Input
                            id="meeting-title"
                            placeholder="Vendor sync"
                            value={values.title}
                            onChange={(event) => set("title", event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meeting-date">
                            Date <span className="text-danger">*</span>
                        </Label>
                        <Input
                            id="meeting-date"
                            type="date"
                            value={values.date}
                            onChange={(event) => set("date", event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meeting-time">Time</Label>
                        <Input
                            id="meeting-time"
                            type="time"
                            value={values.time}
                            onChange={(event) => set("time", event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meeting-mode">Mode</Label>
                        <Select value={values.mode} onValueChange={(next) => set("mode", next as MeetingMode)}>
                            <SelectTrigger id="meeting-mode">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                        <Label>Agenda points</Label>
                        <div className="space-y-2">
                            {values.points.map((point, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="label-mono w-5 shrink-0 text-right">{index + 1}.</span>
                                    <Input
                                        aria-label={`Agenda point ${index + 1}`}
                                        placeholder="Point to cover"
                                        value={point}
                                        onChange={(event) => updatePoint(index, event.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Remove point ${index + 1}`}
                                        onClick={() => removePoint(index)}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addPoint}>
                            <Plus className="size-4" aria-hidden />
                            Add point
                        </Button>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="meeting-notes">Notes</Label>
                        <Textarea
                            id="meeting-notes"
                            rows={2}
                            placeholder="Optional context, link or follow-ups"
                            value={values.notes}
                            onChange={(event) => set("notes", event.target.value)}
                        />
                    </div>

                    <DialogFooter className="sm:col-span-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {busy ? "Saving…" : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
