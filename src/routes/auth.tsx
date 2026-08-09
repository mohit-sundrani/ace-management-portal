import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Operations Console" },
      {
        name: "description",
        content:
          "Sign in to your Operations Console workspace to manage events, tasks and finance.",
      },
      { property: "og:title", content: "Sign in — Operations Console" },
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
  const [displayName, setDisplayName] = useState("");
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

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Check your inbox if confirmation is required.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-stroke bg-beige p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-sm bg-electric font-mono text-xs text-white">
            OC
          </span>
          <span className="font-heading text-sm text-foreground">Operations Console</span>
        </div>
        <div className="max-w-md">
          <p className="label-mono">Systems-grade personal ops</p>
          <h2 className="mt-4 font-heading text-3xl leading-snug text-foreground">
            Events, tasks and money in one accountable ledger.
          </h2>
          <p className="mt-4 text-sm text-grey">
            Every new workspace is seeded with realistic accounts, categories, an in-flight event
            and a year of transactions, so the console is useful the moment you land.
          </p>
        </div>
        <p className="label-mono">encrypted · row-level secured</p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="panel ticked w-full max-w-md p-8">
          <p className="label-mono">Access</p>
          <h1 className="mt-2 font-heading text-2xl text-foreground">Sign in to your console</h1>

          <Button onClick={() => void google()} className="mt-6 w-full" size="lg">
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-stroke" />
            <span className="label-mono">or email</span>
            <span className="h-px flex-1 bg-stroke" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5 space-y-4">
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
            </TabsContent>

            <TabsContent value="signup" className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Aditi Rao"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button
                variant="default"
                className="w-full"
                disabled={busy || !email || password.length < 6}
                onClick={() => void signUp()}
              >
                {busy ? "Creating…" : "Create account"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
