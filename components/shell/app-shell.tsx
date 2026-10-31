"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Sun,
  UserRound,
} from "lucide-react";
import { APPS, appForPath, canSeeApp, canSeeItem, type AppDef, type NavItem } from "@/lib/apps";
import { useSession } from "@/components/session";
import { Avatar, buttonClass } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside, active]);
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-fg">
      <Image src="/belorusneft-emblem.png" alt="Белоруснефть" width={32} height={32} className="h-8 w-8" priority />
      <span className="leading-none">
        <span className="block text-[19px] font-extrabold tracking-tight">белоруснефть</span>
        <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">корп. портал</span>
      </span>
    </Link>
  );
}

function AppIcon({ app, size = "md" }: { app: AppDef; size?: "sm" | "md" | "lg" }) {
  const Icon = app.icon;
  const s = size === "sm" ? "h-7 w-7 rounded-md" : size === "lg" ? "h-12 w-12 rounded-xl" : "h-8 w-8 rounded-lg";
  const i = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <span className={`flex shrink-0 items-center justify-center ${s} ${app.color}`}>
      <Icon className={i} />
    </span>
  );
}

export { AppIcon };

function AppSwitcher({ current }: { current: AppDef }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);

  const apps = APPS.filter((a) => canSeeApp(a, session));
  const filtered = apps.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(filtered.map((a) => a.group))];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 items-center gap-2 rounded-lg border px-1.5 pr-3 text-sm font-bold transition-colors ${
          open ? "border-line bg-hover" : "border-transparent hover:bg-hover"
        }`}
      >
        <AppIcon app={current} size="sm" />
        <span className="text-fg">{current.name}</span>
        {open ? <ChevronUp className="h-4 w-4 text-fg-subtle" /> : <ChevronDown className="h-4 w-4 text-fg-subtle" />}
      </button>
      {open && (
        <div className="animate-in absolute left-0 top-12 z-40 w-[290px] overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Приложения
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-fg-muted">{apps.length}</span>
          </div>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск приложений…"
                className="h-8 w-full rounded-md border border-line bg-card pl-8 pr-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {groups.map((g) => (
              <div key={g} className="mb-1">
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{g}</div>
                {filtered
                  .filter((a) => a.group === g)
                  .map((a) => (
                    <Link
                      key={a.code}
                      href={a.basePath}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        a.code === current.code ? "bg-hover text-fg" : "text-fg-muted hover:bg-hover hover:text-fg"
                      }`}
                    >
                      <AppIcon app={a} />
                      {a.name}
                    </Link>
                  ))}
              </div>
            ))}
            {filtered.length === 0 && <div className="px-2 py-6 text-center text-xs text-fg-subtle">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const entries = useMemo(() => {
    const out: { label: string; sub: string; href: string; app: AppDef }[] = [];
    for (const app of APPS.filter((a) => canSeeApp(a, session))) {
      out.push({ label: app.name, sub: "Приложение", href: app.basePath, app });
      for (const s of app.nav)
        for (const it of s.items)
          if (canSeeItem(it, session) && it.href !== app.basePath) out.push({ label: it.label, sub: app.name, href: it.href, app });
    }
    return out;
  }, [session]);
  const filtered = entries.filter((e) => `${e.label} ${e.sub}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    setQ("");
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={onClose}>
      <div className="animate-in w-full max-w-lg overflow-hidden rounded-xl border border-line bg-elevated shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, filtered.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && filtered[active]) go(filtered[active].href);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Поиск по разделам и приложениям…"
            className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">Esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.map((e, i) => (
            <button
              key={e.href + e.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(e.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-hover" : ""}`}
            >
              <AppIcon app={e.app} size="sm" />
              <span className="flex-1 font-medium text-fg">{e.label}</span>
              <span className="text-xs text-fg-subtle">{e.sub}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-fg-subtle">Ничего не найдено</div>}
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <button onClick={toggle} className={buttonClass("ghost", "icon", "border-line!")} title="Сменить тему" aria-label="Сменить тему">
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}

function UserMenu() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false), open);
  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="rounded-full ring-2 ring-transparent hover:ring-line" aria-label="Меню пользователя">
        <Avatar name={session.employee.fullName} size="sm" />
      </button>
      {open && (
        <div className="animate-in absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={session.employee.fullName} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-fg">{session.employee.fullName}</div>
              <div className="truncate text-xs text-fg-muted">{session.employee.position}</div>
              <div className="truncate text-xs text-fg-subtle">{session.employee.departmentName}</div>
            </div>
          </div>
          <div className="border-b border-line px-4 py-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Роли</div>
            <div className="flex flex-wrap gap-1">
              {session.roles.map((r) => (
                <span key={r.id} className="rounded-md bg-muted px-2 py-0.5 text-xs text-fg-muted">
                  {r.name}
                </span>
              ))}
            </div>
          </div>
          <div className="p-1.5">
            <Link href="/my/hardware" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-hover hover:text-fg">
              <UserRound className="h-4 w-4" /> Мой профиль и оборудование
            </Link>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-hover">
              <LogOut className="h-4 w-4" /> Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isActive(item: NavItem, pathname: string) {
  const href = item.href.split("?")[0];
  return item.exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({ app, onNavigate }: { app: AppDef; onNavigate?: () => void }) {
  const session = useSession();
  const pathname = usePathname();
  const action = app.primaryAction;
  const showAction = action && (!action.permission || action.permission.some((p) => session.permissions.includes(p)));
  return (
    <aside className="flex h-full w-[255px] flex-col border-r border-line bg-elevated">
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-4">
        {showAction && (
          <Link href={action.href} onClick={onNavigate} className={buttonClass("primary", "lg", "mb-4 w-full")}>
            <Plus className="h-4 w-4" /> {action.label}
          </Link>
        )}
        {app.nav.map((section) => {
          const items = section.items.filter((i) => canSeeItem(i, session));
          if (!items.length) return null;
          return (
            <div key={section.title} className="mb-4">
              <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{section.title}</div>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = isActive(item, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[15px] transition-colors ${
                          active
                            ? "border-line bg-card font-semibold text-fg shadow-sm"
                            : "border-transparent text-fg-muted hover:bg-hover hover:text-fg"
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] ${active ? "text-fg" : "text-fg-subtle"}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-500">{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line px-3 py-3 text-center">
        <div className="mb-2 font-mono text-[10px] text-fg-subtle">v0.1.0 · mvp</div>
        <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Прототип
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = appForPath(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-elevated px-4">
        <button
          onClick={() => {
            if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
            else setMobileOpen((o) => !o);
          }}
          className={buttonClass("ghost", "icon", "border-line!")}
          aria-label="Свернуть меню"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Logo />
        <span className="hidden text-xl text-fg-subtle sm:inline">/</span>
        <AppSwitcher current={app} />
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-full max-w-[290px] items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-fg-subtle hover:border-line-strong md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Поиск…</span>
            <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
          </button>
        </div>
        <div className="flex items-center gap-2 border-r border-line pr-3">
          <ThemeToggle />
        </div>
        <UserMenu />
      </header>
      <div className="flex min-h-0 flex-1">
        <div className={`hidden shrink-0 lg:block ${collapsed ? "lg:hidden" : ""}`}>
          <Sidebar app={app} />
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 top-[60px] z-30 flex lg:hidden">
            <Sidebar app={app} onNavigate={() => setMobileOpen(false)} />
            <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
          <div className="mx-auto w-full max-w-[1320px] px-5 py-8 md:px-10">{children}</div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
