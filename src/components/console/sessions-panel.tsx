import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronsUpDown, Laptop, LogOut, Phone, Tablet, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { useSessions, type SessionWithEvents } from "@/hooks/use-sessions";
import { describeSession } from "@/services/session";

function DeviceIcon({ userAgent }: { userAgent?: string | null }) {
    if (!userAgent) return <div className="bg-grey/20 size-4 rounded-full" />;
    if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
        return <Phone className="size-4" />;
    }
    if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
        return <Tablet className="size-4" />;
    }
    return <Laptop className="size-4" />;
}

function TimeAgo({ iso }: { iso: string }) {
    const [ago, setAgo] = useState(() => diffAgo(iso));

    useEffect(() => {
        const tick = setInterval(() => setAgo(diffAgo(iso)), 60_000);
        return () => clearInterval(tick);
    }, [iso]);

    return <span className="label-mono text-grey text-xs">{ago}</span>;
}

function diffAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

export function SessionsPanel() {
    const { sessions, loading, activeSession, verification, reload, revoke, revokeOthers, signOutAll, refreshEvents } =
        useSessions();

    const [expanded, setExpanded] = useState<string | null>(null);
    const [eventsMap, setEventsMap] = useState<Record<string, SessionEvent[]>>({});

    useEffect(() => {
        if (!expanded) return;
        refreshEvents(expanded).then((events) => {
            setEventsMap((prev) => ({ ...prev, [expanded]: events }));
        });
    }, [expanded, refreshEvents]);

    if (loading) {
        return (
            <Panel>
                <PanelHeader eyebrow="Security" title="Active sessions" />
                <PanelBody>
                    <div className="text-grey flex items-center gap-2">
                        <Wifi className="size-4 animate-pulse" />
                        <span className="text-sm">Loading sessions…</span>
                    </div>
                </PanelBody>
            </Panel>
        );
    }

    return (
        <Panel>
            <PanelHeader eyebrow="Security" title="Active sessions" />
            <PanelBody className="space-y-5">
                {/* Verification status */}
                {verification && (
                    <div
                        className={`flex items-start gap-3 rounded-md border p-4 ${
                            verification.allowed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
                        }`}
                    >
                        {verification.allowed ? (
                            <Wifi className="size-5 shrink-0 text-green-600" />
                        ) : (
                            <WifiOff className="size-5 shrink-0 text-amber-600" />
                        )}
                        <div className="min-w-0">
                            <p className={`font-medium ${verification.allowed ? "text-green-800" : "text-amber-800"}`}>
                                {verification.allowed ? "Device recognized" : "Device not recognized"}
                            </p>
                            {verification.reason && (
                                <p className="mt-0.5 text-sm text-amber-700">{verification.reason}</p>
                            )}
                            {verification.allowed && (
                                <p className="label-mono mt-1 text-xs text-green-600">
                                    This device is approved to access the portal.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {sessions.length === 0 ? (
                    <div className="py-8 text-center">
                        <Laptop className="text-grey mx-auto size-10" />
                        <p className="text-grey mt-3 text-sm">No sessions yet</p>
                        <p className="text-grey mt-1 text-xs">Sessions appear after you sign in.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {sessions.map((session) => {
                            const isActive = session.id === activeSession?.id;
                            const isRevoked = session.revoked;
                            const events = eventsMap[session.id] ?? [];
                            const expandedNow = expanded === session.id;
                            const deviceDesc = describeSession(session);

                            return (
                                <li
                                    key={session.id}
                                    className={`rounded-md border ${
                                        isRevoked
                                            ? "border-grey/30 bg-grey/5"
                                            : isActive
                                              ? "border-electric/30 bg-electric/5"
                                              : "border-transparent"
                                    }`}
                                >
                                    <div className="flex items-start gap-3 p-4">
                                        {/* Device icon */}
                                        <div className="mt-0.5">
                                            <DeviceIcon userAgent={session.user_agent} />
                                        </div>

                                        {/* Session info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {session.device_label || "Browser"}
                                                </span>
                                                {isActive && (
                                                    <span className="label-mono bg-electric/10 text-electric rounded-full px-2 py-0.5 text-xs">
                                                        Current
                                                    </span>
                                                )}
                                                {isRevoked && (
                                                    <span className="label-mono bg-grey/20 text-grey rounded-full px-2 py-0.5 text-xs">
                                                        Revoked
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-grey mt-1 flex items-center gap-3 text-xs">
                                                <TimeAgo iso={session.last_active_at} />
                                                {session.ip_address && (
                                                    <span className="font-mono">{session.ip_address}</span>
                                                )}
                                            </div>

                                            {/* Events list */}
                                            {events.length > 0 && expandedNow && (
                                                <div className="border-grey/10 mt-3 space-y-1 border-t pt-3">
                                                    <p className="label-mono text-grey text-xs tracking-wide uppercase">
                                                        Activity
                                                    </p>
                                                    {events.map((evt) => (
                                                        <div key={evt.id} className="flex items-center gap-2 text-xs">
                                                            <span
                                                                className={`label-mono rounded px-1.5 py-0.5 ${
                                                                    evt.event_type === "login"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : evt.event_type === "revoke"
                                                                          ? "bg-red-100 text-red-700"
                                                                          : evt.event_type === "heartbeat"
                                                                            ? "bg-blue-100 text-blue-700"
                                                                            : "bg-grey/10 text-grey"
                                                                }`}
                                                            >
                                                                {evt.event_type}
                                                            </span>
                                                            {evt.note && (
                                                                <span className="text-grey truncate">{evt.note}</span>
                                                            )}
                                                            <span className="text-grey/60 label-mono ml-auto">
                                                                {new Date(evt.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                                                aria-label="Toggle details"
                                                className="text-grey"
                                            >
                                                {expandedNow ? (
                                                    <ChevronsUpDown className="size-4" />
                                                ) : (
                                                    <ChevronDown className="size-4" />
                                                )}
                                            </Button>

                                            {!isRevoked && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        revoke(session.id).then((ok) => {
                                                            if (ok) toast.success("Session revoked");
                                                        });
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    aria-label="Revoke this session"
                                                >
                                                    <LogOut className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Bulk actions */}
                {sessions.length > 0 && !loading && (
                    <div className="border-grey/10 flex flex-wrap items-center justify-between gap-3 border-t pt-2">
                        <div className="text-grey label-mono flex items-center gap-2 text-xs">
                            <span>
                                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                            </span>
                            {activeSession && (
                                <>
                                    <span className="text-grey/50">·</span>
                                    <span>1 active</span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {activeSession && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        revokeOthers(activeSession.id).then(() => {
                                            toast.success("Other sessions revoked");
                                        });
                                    }}
                                    className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                >
                                    <Trash2 className="size-4" />
                                    Revoke all others
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    signOutAll().then(() => {
                                        toast.success("Signed out everywhere");
                                    });
                                }}
                                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                                <LogOut className="size-4" />
                                Sign out everywhere
                            </Button>
                        </div>
                    </div>
                )}

                {/* Info box */}
                <div className="bg-grey/5 border-grey/10 rounded-md border p-4">
                    <p className="text-grey label-mono mb-2 text-xs">About device verification</p>
                    <p className="text-grey/80 text-xs leading-relaxed">
                        When you sign in, this browser generates a device fingerprint from your screen size, timezone,
                        platform and browser. That fingerprint is hashed and stored with your session. If a sign-in
                        attempt comes from a device that doesn&apos;t match any known fingerprint, you&apos;ll see a
                        warning and the session won&apos;t be allowed until you approve it.
                    </p>
                    <p className="text-grey/60 label-mono mt-2 text-xs">
                        Session data is stored in your Supabase project. No fingerprint data leaves your device in
                        identifiable form.
                    </p>
                </div>
            </PanelBody>
        </Panel>
    );
}
