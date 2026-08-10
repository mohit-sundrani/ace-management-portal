import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings - ACE Management" },
      {
        name: "description",
        content: "Workspace preferences: display name, reporting currency and session controls.",
      },
      { property: "og:title", content: "Settings - ACE Management" },
      { property: "og:description", content: "Tune your workspace preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setCurrency(profile.currency);
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, currency })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Settings saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <>
      <PageHeader title="Settings" description="Preferences that apply across the whole console." />

      <Panel>
        <PanelHeader eyebrow="Profile" title="Workspace identity" />
        <PanelBody className="max-w-md space-y-5">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Aditi Rao"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Reporting currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              placeholder="INR"
            />
            <p className="label-mono">ISO 4217 code used for every formatted amount.</p>
          </div>
          <Button onClick={() => void save()} disabled={busy || !displayName}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </PanelBody>
      </Panel>

      <Panel className="mt-6">
        <PanelHeader eyebrow="Session" title="Sign out" />
        <PanelBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-grey">End this session on the current device.</p>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </PanelBody>
      </Panel>
    </>
  );
}
