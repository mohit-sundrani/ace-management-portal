import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Collectible } from "@/components/ui/collectible";
import { collectFingerprintInput, computeFingerprint, createSession, verifyCurrentSession } from "@/services/session";

export const Route = createFileRoute("/auth")({
    head: () => ({
        meta: [
            { title: "Sign in - ACE Management" },
            {
                name: "description",
                content: "Sign in to your ACE Management workspace to manage events, tasks and finance.",
            },
            { property: "og:title", content: "Sign in - ACE Management" },
            { property: "og:description", content: "Access your personal operations workspace." },
        ],
    }),
    component: AuthPage,
});

type Screen = "login" | "verifying" | "new-device" | "approved";

function AuthPage() {
    const navigate = useNavigate();
    const { session, user } = useAuth();
    const [screen, setScreen] = useState<Screen>("login");
    const [deviceName, setDeviceName] = useState("");
    const [busy, setBusy] = useState(false);

    // Redirect if already signed in
    useEffect(() => {
        if (session) {
            // If we came back from Google OAuth, we need to verify the device
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            if (code) {
                // OAuth callback — verify device before granting access
                setScreen("verifying");
                return;
            }
            // Already verified, go to dashboard
            void navigate({ to: "/dashboard" });
        }
    }, [session, navigate]);

    // Handle OAuth callback — verify device fingerprint
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        // Also check hash fragment (some OAuth flows return code in hash)
        const hashParams = new URLSearchParams(window.location.hash.split("#")[1] ?? "");
        const hashCode = hashParams.get("code");

        const finalCode = code || hashCode;
        if (finalCode) {
            // Clean URL
            window.history.replaceState({}, "", window.location.pathname);

            // Get session from Supabase (the OAuth callback already created it)
            supabase.auth.getSession().then(({ data }) => {
                if (data.session && data.session.user) {
                    handleOAuthCallback(data.session, data.session.user);
                } else {
                    toast.error("Sign-in failed. Please try again.");
                    setScreen("login");
                }
            });
        }
    }, []);

    const handleOAuthCallback = async (
        session: import("@supabase/supabase-js").Session,
        user: import("@supabase/supabase-js").User,
    ) => {
        if (!session || !user) return;

        const fpInput = collectFingerprintInput();
        const fingerprint = computeFingerprint(fpInput);

        const result = await verifyCurrentSession(fingerprint);

        if (result.allowed) {
            // Device recognized — create session record if needed and go to dashboard
            await createSession(
                session,
                deviceName || "Google Login",
                fingerprint,
                fpInput.userAgent,
                result.session?.ip_address ?? null,
            );
            void navigate({ to: "/dashboard" });
        } else {
            // New device — show approval screen
            setScreen("new-device");
        }
    };

    const handleGoogleSignIn = async () => {
        setBusy(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    scopes: "openid email profile",
                    redirectTo: `${window.location.origin}/auth`,
                },
            });
            if (error) {
                toast.error(error.message);
                setBusy(false);
            }
            // Success — Google will redirect, then we verify on callback
        } catch (err) {
            toast.error("Something went wrong. Please try again.");
            setBusy(false);
        }
    };

    const handleApproveDevice = async () => {
        setBusy(true);
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
            await handleOAuthCallback(data.session, data.session.user);
        }
        setBusy(false);
    };

    // --- Render screens ---

    if (screen === "verifying") {
        return (
            <div className="bg-background grid min-h-screen lg:grid-cols-2">
                <section className="border-stroke bg-beige hidden flex-col justify-between border-r p-12 lg:flex">
                    <div className="flex items-center gap-2.5">
                        <span className="bg-electric grid size-7 place-items-center rounded-sm font-mono text-xs text-white">
                            OC
                        </span>
                        <span className="font-heading text-foreground text-sm">ACE Management</span>
                    </div>
                    <div className="max-w-md">
                        <p className="label-mono">Systems-grade personal ops</p>
                        <h2 className="font-heading text-foreground mt-4 text-3xl leading-snug">
                            Events, tasks and money in one accountable ledger.
                        </h2>
                        <p className="text-grey mt-4 text-sm">
                            Every new workspace is seeded with realistic accounts, categories, an in-flight event and a
                            year of transactions, so the console is useful the moment you land.
                        </p>
                    </div>
                    <p className="label-mono">encrypted · row-level secured</p>
                </section>

                <section className="flex items-center justify-center px-6 py-16">
                    <div className="panel ticked w-full max-w-md p-8">
                        <div className="mb-6 flex items-center justify-center gap-3">
                            <Collectible className="text-electric size-8" />
                        </div>
                        <p className="label-mono text-center">Almost there</p>
                        <h1 className="font-heading text-foreground mt-2 text-center text-2xl">
                            Verifying your device
                        </h1>
                        <p className="text-grey mt-4 text-center text-sm">Checking if this device is recognized...</p>
                        {busy && (
                            <div className="mt-6 flex justify-center">
                                <div className="border-electric h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                            </div>
                        )}
                    </div>
                </section>
            </div>
        );
    }

    if (screen === "new-device") {
        return (
            <div className="bg-background grid min-h-screen lg:grid-cols-2">
                <section className="border-stroke bg-beige hidden flex-col justify-between border-r p-12 lg:flex">
                    <div className="flex items-center gap-2.5">
                        <span className="bg-electric grid size-7 place-items-center rounded-sm font-mono text-xs text-white">
                            OC
                        </span>
                        <span className="font-heading text-foreground text-sm">ACE Management</span>
                    </div>
                    <div className="max-w-md">
                        <p className="label-mono">Systems-grade personal ops</p>
                        <h2 className="font-heading text-foreground mt-4 text-3xl leading-snug">
                            Events, tasks and money in one accountable ledger.
                        </h2>
                        <p className="text-grey mt-4 text-sm">
                            Every new workspace is seeded with realistic accounts, categories, an in-flight event and a
                            year of transactions, so the console is useful the moment you land.
                        </p>
                    </div>
                    <p className="label-mono">encrypted · row-level secured</p>
                </section>

                <section className="flex items-center justify-center px-6 py-16">
                    <div className="panel ticked w-full max-w-md p-8">
                        <div className="mb-6 flex items-center justify-center gap-3">
                            <svg
                                className="size-12 text-amber-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <p className="label-mono text-center text-amber-600">New device detected</p>
                        <h1 className="font-heading text-foreground mt-2 text-center text-2xl">
                            This device is unrecognized
                        </h1>
                        <p className="text-grey mt-4 text-center text-sm">
                            Sign-in detected from a device we don&apos;t recognize. You can approve this device to
                            access your portal, or contact support if this wasn&apos;t you.
                        </p>

                        <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <label className="label-mono text-grey text-xs tracking-wide uppercase">
                                    Device name (optional)
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Home MacBook, Work PC..."
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                />
                            </div>

                            <Button
                                variant="default"
                                className="w-full"
                                disabled={busy}
                                onClick={() => handleApproveDevice()}
                            >
                                {busy ? "Approving…" : "Approve this device"}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
                                disabled={busy}
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = "/auth";
                                }}
                            >
                                Cancel and sign out
                            </Button>
                        </div>

                        <p className="label-mono text-grey mt-6 text-center text-xs">
                            Approved devices can be managed from Settings → Active sessions.
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    // Default: login screen
    return (
        <div className="bg-background grid min-h-screen lg:grid-cols-2">
            <section className="border-stroke bg-beige hidden flex-col justify-between border-r p-12 lg:flex">
                <div className="flex items-center gap-2.5">
                    <span className="bg-electric grid size-7 place-items-center rounded-sm font-mono text-xs text-white">
                        OC
                    </span>
                    <span className="font-heading text-foreground text-sm">ACE Management</span>
                </div>
                <div className="max-w-md">
                    <p className="label-mono">Systems-grade personal ops</p>
                    <h2 className="font-heading text-foreground mt-4 text-3xl leading-snug">
                        Events, tasks and money in one accountable ledger.
                    </h2>
                    <p className="text-grey mt-4 text-sm">
                        Every new workspace is seeded with realistic accounts, categories, an in-flight event and a year
                        of transactions, so the console is useful the moment you land.
                    </p>
                </div>
                <p className="label-mono">encrypted · row-level secured</p>
            </section>

            <section className="flex items-center justify-center px-6 py-16">
                <div className="panel ticked w-full max-w-md p-8">
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <Collectible className="text-electric size-10" />
                    </div>
                    <p className="label-mono text-center">Access</p>
                    <h1 className="font-heading text-foreground mt-2 text-center text-2xl">Sign in with Google</h1>

                    {/* Google sign-in button */}
                    <Button
                        variant="outline"
                        className="border-grey/30 hover:bg-beige hover:border-grey/50 mt-6 w-full gap-3 bg-white"
                        disabled={busy}
                        onClick={() => handleGoogleSignIn()}
                    >
                        {/* Google G icon */}
                        <svg className="size-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </Button>

                    <p className="text-grey label-mono mt-6 text-center text-xs">
                        Only approved devices can access this portal.
                    </p>
                </div>
            </section>
        </div>
    );
}
