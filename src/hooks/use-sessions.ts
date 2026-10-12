import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
    collectFingerprintInput,
    computeFingerprint,
    createSession,
    listSessions,
    revokeSession,
    revokeOtherSessions,
    signOutEverywhere,
    verifyCurrentSession,
    type SessionRecord,
    type SessionEvent,
} from "@/services/session";

export type SessionWithEvents = SessionRecord & { events: SessionEvent[] };

export function useSessions() {
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
    const [verification, setVerification] = useState<{
        allowed: boolean;
        session: SessionRecord | null;
        reason?: string;
    } | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const all = await listSessions();
            setSessions(all);
            // The most recently active session is the "current" one
            const active = all.find((s) => !s.revoked) ?? all[0] ?? null;
            setActiveSession(active);
        } finally {
            setLoading(false);
        }
    }, []);

    // Verify the current device on load + after sign-in
    const verifyDevice = useCallback(
        async (session: Session, fingerprint: string) => {
            const fpInput = collectFingerprintInput();
            const computed = computeFingerprint(fpInput);

            const result = await verifyCurrentSession(computed);
            setVerification(result);

            if (result.allowed && session) {
                // Create the session row if it doesn't exist
                const existing = sessions.find((s) => s.auth_user_id === session.user.id);
                if (!existing) {
                    await createSession(
                        session,
                        result.session?.device_label ?? "Browser",
                        computed,
                        fpInput.userAgent,
                        result.session?.ip_address ?? null,
                    );
                    await reload();
                }
            }

            return result;
        },
        [sessions, reload],
    );

    // Auto-create session on sign-in
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange("SIGNED_IN", async (event, session) => {
            if (event === "SIGNED_IN" && session) {
                const fpInput = collectFingerprintInput();
                const computed = computeFingerprint(fpInput);
                const result = await verifyCurrentSession(computed);

                if (result.allowed) {
                    // Device recognized — refresh sessions
                    await reload();
                } else {
                    // New device — session is created but not yet approved.
                    // The auth page will handle showing the approval screen.
                    const existing = sessions.find((s) => s.auth_user_id === session.user.id && !s.revoked);
                    if (!existing) {
                        await createSession(session, "Browser", computed, fpInput.userAgent, null);
                    }
                    await reload();
                }
            }
            if (event === "SIGNED_OUT") {
                setSessions([]);
                setActiveSession(null);
                setVerification(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [reload]);

    // Reload sessions when the user signs in
    useEffect(() => {
        const check = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                await reload();
            } else {
                setSessions([]);
                setActiveSession(null);
            }
        };
        check();
    }, [reload]);

    const revoke = useCallback(
        async (sessionId: string) => {
            const ok = await revokeSession(sessionId);
            if (ok) {
                // If we revoked the active session, sign out
                if (activeSession?.id === sessionId) {
                    await supabase.auth.signOut();
                }
                await reload();
            }
            return ok;
        },
        [activeSession, reload],
    );

    const revokeOthers = useCallback(
        async (keepSessionId: string) => {
            await revokeOtherSessions(keepSessionId);
            await reload();
        },
        [reload],
    );

    const signOutAll = useCallback(async () => {
        await signOutEverywhere();
        setSessions([]);
        setActiveSession(null);
        setVerification(null);
    }, []);

    const refreshEvents = useCallback(async (sessionId: string): Promise<SessionEvent[]> => {
        const { data, error } = await supabase
            .from("session_events")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) return [];
        return (data ?? []) as SessionEvent[];
    }, []);

    return {
        sessions,
        loading,
        activeSession,
        verification,
        reload,
        verifyDevice,
        revoke,
        revokeOthers,
        signOutAll,
        refreshEvents,
    };
}
