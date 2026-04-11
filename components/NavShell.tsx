"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Home",       icon: "🏠" },
  { href: "/strategies", label: "Strategies", icon: "📊" },
  { href: "/factors",    label: "Factors",    icon: "🧬" },
  { href: "/ide",        label: "IDE",        icon: "⌨️" },
  { href: "/source",     label: "Code",       icon: "📄" },
  { href: "/research",   label: "Research",   icon: "🔬" },
  { href: "/audit",      label: "Audit",      icon: "🛡️" },
  { href: "/sop",        label: "SOP",        icon: "🔄" },
  { href: "/docs",       label: "Docs",       icon: "📦" },
  { href: "/reports",    label: "Reports",    icon: "📋" },
  { href: "/monitor",    label: "Monitor",    icon: "📡" },
  { href: "/trading",    label: "Trading",    icon: "💹" },
  { href: "/risk",       label: "Risk",       icon: "🛡️" },
  { href: "/agents",     label: "Agents",     icon: "🤖" },
  { href: "/credits",    label: "Credits",    icon: "💎" },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    setUser(localStorage.getItem("user") || "user");
  }, [router]);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top nav */}
      <header className="sticky top-0 z-50 flex items-center h-12 px-4 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        {/* Logo */}
        <button onClick={() => router.push("/dashboard")}
          className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mr-6 hover:opacity-80 transition">
          Kuant
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <button key={href} onClick={() => router.push(href)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive(href)
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}>
              <span className="text-base">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <ThemeToggle />
        <span className="text-slate-400 dark:text-slate-500 text-xs mx-3 hidden sm:inline">{user}</span>
        <button onClick={() => { localStorage.clear(); router.push("/login"); }}
          className="text-xs text-slate-400 border border-slate-200 dark:border-slate-600 rounded-md px-2.5 py-1 hover:text-red-500 transition">
          Logout
        </button>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
