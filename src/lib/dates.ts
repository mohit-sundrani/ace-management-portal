import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";

/** Dates are stored as ISO `yyyy-MM-dd` and displayed as DD/MM/YYYY. */
export const parseDate = (value: string): Date => parseISO(value);

export const toISODate = (date: Date): string => format(date, "yyyy-MM-dd");

export const formatDate = (value?: string | null): string => (value ? format(parseISO(value), "dd/MM/yyyy") : "-");

export const formatDateLong = (value?: string | null): string =>
    value ? format(parseISO(value), "EEE dd MMM yyyy") : "-";

export const formatDayLabel = (value?: string | null): string => {
    if (!value) return "-";
    const date = parseISO(value);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "dd MMM");
};

export const formatTime = (value?: string | null): string => {
    if (!value) return "";
    const [h, m] = value.split(":");
    return `${h?.padStart(2, "0")}:${m ?? "00"}`;
};

export const formatRelative = (value?: string | null): string =>
    value ? `${formatDistanceToNowStrict(parseISO(value))} ago` : "-";

export const timeRange = (start?: string | null, end?: string | null): string => {
    if (!start) return "All day";
    return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
};

export const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U";
