import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Device fingerprint — built from stable browser signals only.
// Not a privacy-invasive canvas/audio fingerprint; just enough to detect
// "this looks like a different device" so the user can approve or deny.
// ---------------------------------------------------------------------------

export type FingerprintInput = {
    /** RFC 7239 forwarded-for / direct IP — passed from the server if available. */
    ip?: string | null;
    /** Browser user-agent string. */
    userAgent: string;
    /** Screen resolution + color depth. */
    screen: { width: number; height: number; colorDepth: number };
    /** Timezone offset in minutes. */
    timezoneOffset: number;
    /** Platform (win32, macos, linux, etc.). */
    platform: string;
    /** Language / locale. */
    language: string;
    /** Touch support flag. */
    touchPoints: number;
    /** Device memory estimate (if available). */
    deviceMemory?: number;
};

const stableFields = (input: FingerprintInput): string => {
    return [
        input.userAgent.slice(0, 256),
        `${input.screen.width}x${input.screen.height}x${input.screen.colorDepth}`,
        String(input.timezoneOffset),
        input.platform.slice(0, 64),
        input.language.slice(0, 16),
        String(input.touchPoints > 0),
        String(input.deviceMemory ?? -1),
    ].join("|");
};

export function computeFingerprint(input: FingerprintInput): string {
    // Simple hash — not cryptographically secure, but good enough to detect
    // different environments. The stored value is a SHA-256 of this hash so
    // even if leaked it reveals nothing useful.
    const stable = stableFields(input);
    let h = 0;
    for (let i = 0; i < stable.length; i++) {
        h = (Math.imul(31, h) + stable.charCodeAt(i)) | 0;
    }
    // Combine with a random salt stored per-session so the same device on
    // different days can still be recognized if the salt is persisted.
    return String(h >>> 0);
}

// We store a SHA-256 hex of the fingerprint + per-session salt so the
// raw fingerprint never hits the DB in recoverable form.
export async function fingerprintHash(fingerprint: string, salt: string): Promise<string> {
    const msg = new TextEncoder().encode(`${fingerprint}:${salt}`);
    const buf = await crypto.subtle.digest("SHA-256", msg);
    const bytes = new Uint8Array(buf);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/** Generate a per-session random salt (stored client-side in memory, not persisted). */
export function generateSalt(): string {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ---------------------------------------------------------------------------
// Collect browser fingerprint input
// ---------------------------------------------------------------------------

export function collectFingerprintInput(): FingerprintInput {
    // On server (SSR) we return minimal / null values; the session service
    // will treat null fingerprint as "no device verification" and allow access
    // (since this is a single-user tool, the tradeoff is acceptable).
    if (typeof window === "undefined") {
        return {
            ip: null,
            userAgent: "",
            screen: { width: 0, height: 0, colorDepth: 0 },
            timezoneOffset: 0,
            platform: "",
            language: "",
            touchPoints: 0,
        };
    }

    return {
        ip: null, // filled in by the server if we want; for now leave null
        userAgent: navigator.userAgent,
        screen: {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
        },
        timezoneOffset: new Date().getTimezoneOffset(),
        platform: navigator.platform,
        language: navigator.language,
        touchPoints: navigator.maxTouchPoints,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    };
}

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

export type SessionRecord = {
    id: string;
    auth_user_id: string;
    device_label: string;
    fingerprint_hash: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    last_active_at: string;
    revoked: boolean;
};

export type SessionEvent = {
    id: string;
    session_id: string;
    event_type: string;
    note: string | null;
    created_at: string;
};

// ---------------------------------------------------------------------------
// Session service — manages active sessions + device verification
// ---------------------------------------------------------------------------

const SALT_KEY = "session_salt_v1";

export async function getOrInitSalt(): Promise<string> {
    if (typeof window === "undefined") return "";
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        salt = generateSalt();
        localStorage.setItem(SALT_KEY, salt);
    }
    return salt;
}

/** Create a new session row after successful sign-in. */
export async function createSession(
    session: Session,
    deviceLabel: string,
    fingerprint: string,
    userAgent: string,
    ipAddress: string | null = null,
): Promise<SessionRecord | null> {
    const salt = await getOrInitSalt();
    const hash = await fingerprintHash(fingerprint, salt);

    const { data, error } = await supabase
        .from("sessions")
        .insert({
            auth_user_id: session.user.id,
            device_label: deviceLabel,
            fingerprint_hash: hash,
            user_agent: userAgent,
            ip_address: ipAddress,
        })
        .select()
        .single();

    if (error) {
        console.error("[session] createSession failed:", error);
        return null;
    }

    // Log the login event
    await logSessionEvent(data.id, "login", `Signed in from ${deviceLabel}`);

    return data;
}

/** Update last_active_at by inserting a heartbeat event. */
export async function touchSession(sessionId: string): Promise<void> {
    await logSessionEvent(sessionId, "heartbeat", "Session activity");
}

/** Log out a specific session (revoke it). */
export async function revokeSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase.from("sessions").update({ revoked: true }).eq("id", sessionId);

    if (error) {
        console.error("[session] revokeSession failed:", error);
        return false;
    }

    // We don't delete the actual Supabase auth session here — that only happens
    // on signOut(). This just marks the session as revoked so it can't be used.
    await logSessionEvent(sessionId, "revoke", "Manually revoked by user");
    return true;
}

/** Revoke all other sessions except the current one. */
export async function revokeOtherSessions(keepSessionId: string): Promise<void> {
    // Use the DB function that handles this atomically
    const { error } = await supabase.rpc("revoke_other_sessions", {
        keep_session_id: keepSessionId,
    });

    if (error) {
        console.error("[session] revokeOtherSessions failed:", error);
        return;
    }

    // Log for each affected session would require fetching them first.
    // For simplicity we just log on the kept session.
    await logSessionEvent(keepSessionId, "reauth", "Other sessions revoked");
}

/** Sign out everywhere — revoke all sessions + sign out of Supabase auth. */
export async function signOutEverywhere(): Promise<void> {
    const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "");

    if (sessions) {
        for (const s of sessions) {
            await logSessionEvent(s.id, "revoke", "Signed out everywhere");
        }
        await supabase.from("sessions").update({ revoked: true }).eq("auth_user_id", sessions[0]?.auth_user_id);
    }

    await supabase.auth.signOut();
}

/** Log a session event. */
export async function logSessionEvent(sessionId: string, eventType: string, note?: string): Promise<void> {
    await supabase.rpc("log_session_event", {
        _session_id: sessionId,
        _event_type: eventType,
        _note: note ?? null,
    });
}

/** Fetch all sessions for the current user. */
export async function listSessions(): Promise<SessionRecord[]> {
    const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[session] listSessions failed:", error);
        return [];
    }

    return (data ?? []) as SessionRecord[];
}

/** Fetch events for a specific session. */
export async function listSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    const { data, error } = await supabase
        .from("session_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("[session] listSessionEvents failed:", error);
        return [];
    }

    return (data ?? []) as SessionEvent[];
}

/** Check if the current device/site is allowed to continue.
 *  Returns { allowed: boolean, session, reason? }
 */
export async function verifyCurrentSession(
    expectedFingerprint: string,
): Promise<{ allowed: boolean; session: SessionRecord | null; reason?: string }> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
        return { allowed: false, session: null, reason: "Not signed in" };
    }

    const salt = await getOrInitSalt();
    const hash = await fingerprintHash(expectedFingerprint, salt);

    // Call the DB function that returns the matching active session
    const { data: session, error } = await supabase.rpc("current_session", {
        _fingerprint_hash: hash,
    });

    if (error) {
        console.error("[session] verifyCurrentSession failed:", error);
        return { allowed: false, session: null, reason: "Session check failed" };
    }

    if (!session) {
        // No matching session — check if any active sessions exist at all
        const { data: allSessions } = await supabase
            .from("sessions")
            .select("*")
            .eq("auth_user_id", auth.user.id)
            .eq("revoked", false)
            .order("last_active_at", { ascending: false })
            .limit(1);

        if (!allSessions || allSessions.length === 0) {
            // No sessions at all for this user — fingerprint can't be verified
            // This happens on first login; the caller should create a session
            return { allowed: false, session: null, reason: "No active sessions" };
        }

        // Sessions exist but fingerprint doesn't match any of them
        return {
            allowed: false,
            session: allSessions[0] as SessionRecord,
            reason: "Device not recognized",
        };
    }

    if (session.revoked) {
        return { allowed: false, session, reason: "Session has been revoked" };
    }

    return { allowed: true, session };
}

/** Generate a human-readable label for a session based on user-agent and IP. */
export function describeSession(record: SessionRecord): string {
    const ua = record.user_agent ?? "";
    let label = record.device_label || "Unknown device";

    // Parse common UA patterns
    if (ua.includes("Mac OS X")) label = label || "Mac";
    else if (ua.includes("Windows")) label = label || "Windows";
    else if (ua.includes("Linux") && !ua.includes("Android")) label = label || "Linux";
    else if (ua.includes("Android")) label = label || "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) label = label || "iOS";

    const timeAgo = timeAgoString(record.last_active_at);
    return `${label} · ${timeAgo}`;
}

function timeAgoString(iso: string): string {
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
