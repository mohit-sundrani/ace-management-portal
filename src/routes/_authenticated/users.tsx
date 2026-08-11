import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ShieldOff, Users } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/console/data-table";
import { PageHeader } from "@/components/console/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel";
import { StatCell, StatGrid } from "@/components/console/stat";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/console/states";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, initialsOf } from "@/lib/dates";
import { friendly } from "@/services/db";
import type { Row } from "@/services/db";

export const Route = createFileRoute("/_authenticated/users")({
    head: () => ({
        meta: [
            { title: "Users - ACE Management" },
            {
                name: "description",
                content: "Workspace membership, assigned roles and the access model behind the console.",
            },
            { property: "og:title", content: "Users - ACE Management" },
            { property: "og:description", content: "Identity and roles for your workspace." },
        ],
    }),
    component: UsersPage,
});

function UsersPage() {
    const { user, isAdmin } = useAuth();
    const client = useQueryClient();

    const profiles = useCollection("profiles", { orderBy: { column: "display_name" } });
    const roleRows = useCollection("user_roles", {});

    const rows = profiles.data ?? [];

    const rolesByUser = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const role of roleRows.data ?? []) {
            const list = map.get(role.user_id) ?? [];
            list.push(role.role);
            map.set(role.user_id, list);
        }
        return map;
    }, [roleRows.data]);

    const changeRole = async (target: Row<"profiles">, makeAdmin: boolean) => {
        const { error } = makeAdmin
            ? await supabase.from("user_roles").insert({ user_id: target.id, role: "administrator" })
            : await supabase.from("user_roles").delete().eq("user_id", target.id).eq("role", "administrator");
        if (error) {
            toast.error(friendly("change roles", error.code));
            return;
        }
        toast.success(
            makeAdmin
                ? `${target.display_name || "User"} is now an administrator`
                : `${target.display_name || "User"} is now a standard user`,
        );
        void client.invalidateQueries();
    };

    const columns = useMemo<ReadonlyArray<Column<Row<"profiles">>>>(() => {
        const base: Array<Column<Row<"profiles">>> = [
            {
                key: "user",
                header: "User",
                cell: (profile) => (
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="border-stroke bg-beige text-foreground grid size-8 shrink-0 place-items-center rounded-full border font-mono text-[0.625rem] font-medium">
                            {initialsOf(profile.display_name || "User")}
                        </span>
                        <div className="min-w-0">
                            <p className="text-foreground truncate font-medium">
                                {profile.display_name || "Unnamed"}
                                {profile.id === user?.id ? <span className="text-grey"> · you</span> : null}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: "roles",
                header: "Roles",
                cell: (profile) => {
                    const assigned = rolesByUser.get(profile.id) ?? [];
                    const list = assigned.length ? assigned : ["user"];
                    return (
                        <span className="flex flex-wrap gap-2">
                            {list.map((role) => (
                                <StatusBadge key={role} tone={role === "administrator" ? "info" : "neutral"}>
                                    {role}
                                </StatusBadge>
                            ))}
                        </span>
                    );
                },
            },
            { key: "member", header: "Member since", cell: (profile) => formatDate(profile.created_at) },
        ];

        if (isAdmin) {
            base.push({
                key: "actions",
                header: "",
                align: "right",
                cell: (profile) => {
                    if (profile.id === user?.id) {
                        return <span className="label-mono text-grey">you</span>;
                    }
                    const isAdminUser = (rolesByUser.get(profile.id) ?? []).includes("administrator");
                    return (
                        <Button
                            variant={isAdminUser ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => void changeRole(profile, !isAdminUser)}
                        >
                            {isAdminUser ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                            {isAdminUser ? "Remove admin" : "Make admin"}
                        </Button>
                    );
                },
            });
        }

        return base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, user?.id, rolesByUser]);

    const adminCount = rows.filter((profile) => (rolesByUser.get(profile.id) ?? []).includes("administrator")).length;

    if (profiles.error) return <ErrorState message={(profiles.error as Error).message} />;

    return (
        <>
            <PageHeader
                title="Users"
                description="Workspace membership and roles - every workspace stays private via row-level security."
            />

            <StatGrid className="xl:grid-cols-3">
                <StatCell label="Members" value={rows.length} caption="Profiles in workspace" emphasis />
                <StatCell label="Administrators" value={adminCount} caption="Can manage roles" />
                <StatCell
                    label="Your access"
                    value={isAdmin ? "Administrator" : "Standard"}
                    caption="Enforced server-side"
                />
            </StatGrid>

            <Panel className="mt-6">
                <PanelHeader eyebrow="Membership" title="People" />
                {profiles.isLoading ? (
                    <RowSkeleton columns={4} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        eyebrow="No members"
                        title="Your workspace is empty"
                        description="Other people appear here once they sign in and join the workspace."
                    />
                ) : (
                    <DataTable columns={columns} rows={rows} compact />
                )}
            </Panel>

            <Panel className="mt-6">
                <PanelHeader eyebrow="Access model" title="How permissions work" />
                <PanelBody className="text-grey space-y-3 text-sm">
                    <p>
                        Roles live in a dedicated table, never on the profile, so a compromised profile update can never
                        grant administrator rights. Administrators can promote or demote members from this page; an
                        administrator can never remove their own admin role, so the workspace can never lock itself out.
                    </p>
                    <p>
                        Every table enforces row-level security scoped to your user id. Reads and writes are checked by
                        the database itself, not by the interface.
                    </p>
                </PanelBody>
            </Panel>
        </>
    );
}
