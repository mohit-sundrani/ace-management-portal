import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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

function AuthPage() {
    const navigate = useNavigate();
    const { session } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (session) void navigate({ to: "/dashboard" });
    }, [session, navigate]);

    const signIn = async () => {
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        void navigate({ to: "/dashboard" });
    };

    return (
        <div className="grid min-h-screen bg-background lg:grid-cols-2">
            <section className="hidden flex-col justify-between border-r border-stroke bg-beige p-12 lg:flex">
                <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-sm bg-electric font-mono text-xs text-white">
                        OC
                    </span>
                    <span className="font-heading text-sm text-foreground">ACE Management</span>
                </div>
                <div className="max-w-md">
                    <p className="label-mono">Systems-grade personal ops</p>
                    <h2 className="mt-4 font-heading text-3xl leading-snug text-foreground">
                        Events, tasks and money in one accountable ledger.
                    </h2>
                    <p className="mt-4 text-sm text-grey">
                        Every new workspace is seeded with realistic accounts, categories, an in-flight event and a year
                        of transactions, so the console is useful the moment you land.
                    </p>
                </div>
                <p className="label-mono">encrypted · row-level secured</p>
            </section>

            <section className="flex items-center justify-center px-6 py-16">
                <div className="panel ticked w-full max-w-md p-8">
                    <p className="label-mono">Access</p>
                    <h1 className="mt-2 font-heading text-2xl text-foreground">Sign in to your console</h1>

                    <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>
                        <Button
                            variant="default"
                            className="w-full"
                            disabled={busy || !email || !password}
                            onClick={() => void signIn()}
                        >
                            {busy ? "Signing in…" : "Sign in"}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
