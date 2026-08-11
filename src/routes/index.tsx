import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
    component: RootRedirect,
});

function RootRedirect() {
    const navigate = useNavigate();
    const { session, loading } = useAuth();

    useEffect(() => {
        if (loading) return;
        void navigate({ to: session ? "/dashboard" : "/auth", replace: true });
    }, [session, loading, navigate]);

    return null;
}
