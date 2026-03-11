"use client";

import { BarChart3Icon, CheckSquare2Icon, Settings2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const ITEMS = [
    {
        href: "/habits",
        label: "Habits",
        icon: CheckSquare2Icon,
    },
    {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3Icon,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: Settings2Icon,
    },
] as const;

export const PlatformNavigation = () => {
    const pathname = usePathname();

    return (
        <div className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <Logo href="/habits" className="shrink-0" />

                <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/10 p-1">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-foreground-400 hover:bg-white/5 hover:text-foreground",
                                ].join(" ")}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};
