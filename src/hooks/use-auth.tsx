import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type Profile = {
    id: string;
    display_name: string;
    avatar_url: string | null;
    currency: string;
};

type AuthState = {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const userId = session?.user.id ?? null;

    const loadIdentity = async (id: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, currency")
            .eq("id", id)
            .maybeSingle();
        setProfile(data ?? null);
    };

    useEffect(() => {
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
            setSession(next);
            if (!next) {
                setProfile(null);
            }
        });

        void supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        return () => subscription.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) return;
        void loadIdentity(userId);
    }, [userId]);

    const value = useMemo<AuthState>(
        () => ({
            session,
            user: session?.user ?? null,
            profile,
            loading,
            refreshProfile: async () => {
                if (userId) await loadIdentity(userId);
            },
        }),
        [session, profile, loading, userId],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
