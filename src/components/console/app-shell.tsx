import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
    CalendarClock,
    CalendarDays,
    CalendarRange,
    ChevronsLeft,
    ChevronsRight,
    CircleDollarSign,
    FileText,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    Moon,
    PanelsTopLeft,
    Receipt,
    RefreshCcw,
    Search,
    Settings,
    Shapes,
    Sun,
    Target,
    Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf } from "@/lib/dates";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: ReadonlyArray<NavItem> };

const NAV: ReadonlyArray<NavGroup> = [
    {
        label: "Overview",
        items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Operations",
        items: [
            { label: "Events", to: "/events", icon: PanelsTopLeft },
            { label: "Tasks", to: "/tasks", icon: ListChecks },
            { label: "Meetings", to: "/meetings", icon: CalendarClock },
            { label: "Calendar", to: "/calendar", icon: CalendarDays },
        ],
    },
    {
        label: "Finance",
        items: [
            { label: "Overview", to: "/finance", icon: CircleDollarSign },
            { label: "Transactions", to: "/finance/transactions", icon: Receipt },
            { label: "Accounts", to: "/finance/accounts", icon: Wallet },
            { label: "Budgets", to: "/finance/budgets", icon: Target },
            { label: "Categories", to: "/finance/categories", icon: Shapes },
            { label: "Recurring", to: "/finance/recurring", icon: RefreshCcw },
            { label: "Statements", to: "/finance/statements", icon: FileText },
        ],
    },
    {
        label: "Workspace",
        items: [{ label: "Settings", to: "/settings", icon: Settings }],
    },
];

const useTheme = () => {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem("console-theme");
        const isDark = stored === "dark";
        setDark(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);

    const toggle = () => {
        setDark((current) => {
            const next = !current;
            document.documentElement.classList.toggle("dark", next);
            window.localStorage.setItem("console-theme", next ? "dark" : "light");
            return next;
        });
    };

    return { dark, toggle };
};

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
    const pathname = useRouterState({ select: (state) => state.location.pathname });

    return (
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Primary">
            {NAV.map((group) => (
                <div key={group.label}>
                    {!collapsed ? <p className="label-mono px-3 pb-2">{group.label}</p> : null}
                    <ul className="space-y-0.5">
                        {group.items.map((item) => {
                            const active =
                                pathname === item.to ||
                                (item.to !== "/finance" && pathname.startsWith(`${item.to}/`)) ||
                                (item.to === "/events" && pathname.startsWith("/events/"));
                            return (
                                <li key={item.to}>
                                    <Link
                                        to={item.to}
                                        onClick={onNavigate}
                                        title={collapsed ? item.label : undefined}
                                        className={cn(
                                            "flex h-9 items-center gap-2 rounded-sm px-3 text-sm transition-colors",
                                            "border-l-2 border-transparent",
                                            active
                                                ? "border-nickel bg-vite/15 text-foreground font-medium"
                                                : "text-grey hover:bg-beige hover:text-foreground",
                                            collapsed && "justify-center px-0",
                                        )}
                                        aria-current={active ? "page" : undefined}
                                    >
                                        <item.icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
                                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

function Brand({ collapsed }: { collapsed: boolean }) {
    return (
        <div className="border-stroke flex h-14 items-center gap-2.5 border-b px-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-black font-mono text-xs font-medium text-white dark:bg-white">
                <img src="/logo.svg" className="aspect-square h-4 w-4 contrast-200 invert dark:invert-0" alt="A" />
            </span>
            {!collapsed ? (
                <span className="min-w-0">
                    <span className="font-heading text-foreground block truncate text-sm">ACE</span>
                    <span className="label-mono block">Management</span>
                </span>
            ) : null}
        </div>
    );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const navigate = useNavigate();
    const go = (to: string) => {
        onOpenChange(false);
        void navigate({ to });
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput placeholder="Jump to a page or action…" />
            <CommandList>
                <CommandEmpty>No matches found.</CommandEmpty>
                {NAV.map((group) => (
                    <CommandGroup key={group.label} heading={group.label.toUpperCase()}>
                        {group.items.map((item) => (
                            <CommandItem
                                key={item.to}
                                value={`${group.label} ${item.label}`}
                                onSelect={() => go(item.to)}
                            >
                                <item.icon className="size-4" strokeWidth={1.5} aria-hidden />
                                {item.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </CommandDialog>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const { profile, user } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        const stored = window.localStorage.getItem("console-sidebar");
        if (stored === "collapsed") setCollapsed(true);
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setPaletteOpen((value) => !value);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const toggleCollapsed = () =>
        setCollapsed((current) => {
            window.localStorage.setItem("console-sidebar", current ? "expanded" : "collapsed");
            return !current;
        });

    const signOut = async () => {
        await supabase.auth.signOut();
        void navigate({ to: "/auth" });
    };

    const name = profile?.display_name || user?.email || "Account";

    return (
        <div
            className="app-shell bg-background min-h-screen md:grid"
            style={{ gridTemplateColumns: `${collapsed ? "4rem" : "15rem"} 1fr` }}
        >
            <aside className="border-stroke bg-beige sticky top-0 hidden h-screen flex-col border-r md:flex">
                <Brand collapsed={collapsed} />
                <NavLinks collapsed={collapsed} />
                <div className="border-stroke border-t p-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleCollapsed}
                        className="w-full justify-center"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
                        {!collapsed ? <span className="text-xs">Collapse</span> : null}
                    </Button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-col">
                <header className="border-stroke bg-background sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 md:px-6">
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                                <Menu className="size-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="border-stroke bg-beige w-64 p-0">
                            <SheetTitle className="sr-only">Navigation</SheetTitle>
                            <Brand collapsed={false} />
                            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
                        </SheetContent>
                    </Sheet>

                    <button
                        type="button"
                        onClick={() => setPaletteOpen(true)}
                        className="border-stroke bg-surface text-grey hover:border-nickel flex h-9 flex-1 items-center gap-2 rounded-sm border px-3 text-left text-sm transition-colors md:max-w-sm"
                    >
                        <Search className="size-4" strokeWidth={1.5} aria-hidden />
                        <span className="flex-1 truncate">Search pages and actions</span>
                        <kbd className="text-grey hidden font-mono text-[0.625rem] tracking-wide uppercase md:inline">
                            ⌘K
                        </kbd>
                    </button>

                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle colour theme">
                            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="border-stroke bg-beige text-foreground hover:border-nickel grid size-8 place-items-center rounded-full border font-mono text-[0.625rem] font-medium transition-colors"
                                    aria-label="Account menu"
                                >
                                    {initialsOf(name)}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-md">
                                <DropdownMenuLabel className="space-y-1">
                                    <span className="text-foreground block truncate text-sm">{name}</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => void signOut()} className="text-danger">
                                    <LogOut className="size-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="page flex-1">{children}</main>
            </div>

            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </div>
    );
}
