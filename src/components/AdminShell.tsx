"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderTree,
  Layers,
  HelpCircle,
  ListChecks,
  Rocket,
  FileCheck,
  Award,
  Trophy,
  Bell,
  BarChart3,
  Settings,
  Search,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: "", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Learning",
    items: [
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/modules", label: "Modules", icon: Layers },
      { href: "/lessons", label: "Lessons", icon: ListChecks },
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/quizzes", label: "Quizzes", icon: HelpCircle },
      { href: "/questions", label: "Questions", icon: HelpCircle },
    ],
  },
  {
    label: "Students",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/certificates", label: "Certificates", icon: Award },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/projects", label: "Projects", icon: Rocket },
      { href: "/submissions", label: "Submissions", icon: FileCheck },
      { href: "/achievements", label: "Achievements", icon: Award },
    ],
  },
  {
    label: "",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeLabel = NAV.flatMap((g) => g.items).find((item) => item.href === pathname)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-backgroundAlt">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">L</div>
          <span className="text-lg font-extrabold tracking-tight text-textPrimary">Learnova</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto">
          {NAV.map((group, i) => (
            <div key={i}>
              {group.label ? <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-textMuted">{group.label}</p> : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? "bg-primary-soft text-primary" : "text-textSecondary hover:bg-backgroundAlt hover:text-textPrimary"
                      }`}
                    >
                      <Icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <p className="px-3 pt-4 text-xs text-textMuted">Learnova Admin v0.1.0</p>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-4">
          <p className="text-sm font-medium text-textSecondary md:hidden">Learnova Admin</p>
          <p className="hidden text-sm text-textSecondary md:block">
            <span className="text-textMuted">Learnova</span> / <span className="font-medium text-textPrimary">{activeLabel}</span>
          </p>
          <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              placeholder="Search..."
              className="w-full rounded-xl border border-border bg-backgroundAlt py-2 pl-9 pr-4 text-sm text-textPrimary outline-none transition-colors focus:border-primary"
            />
          </div>
          <button className="rounded-xl p-2 text-textSecondary transition-colors hover:bg-backgroundAlt hover:text-textPrimary">
            <Bell size={18} />
          </button>
          <UserButton />
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
