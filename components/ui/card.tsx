import Link from "next/link";
import { ChevronRight, House, Inbox, Loader2 } from "lucide-react";
import type { Tone } from "@/lib/enums";
import { initials } from "@/lib/format";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  icon,
  badge,
  actions,
  className = "",
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 border-b border-line px-6 py-4 ${className}`}>
      {icon && (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted">{icon}</span>
      )}
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {badge}
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}

const STAT_TONES: Record<Tone, string> = {
  gray: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-300",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <Card className={`relative p-6 ${href ? "transition-colors hover:border-line-strong" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-fg-muted">{label}</div>
          <div className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-fg">{value}</div>
          {hint && <div className="mt-1 text-xs text-fg-muted">{hint}</div>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${STAT_TONES[tone]}`}>{icon}</span>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
      <House className="h-4 w-4" />
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-4 w-4 text-fg-subtle" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span className="text-fg-muted">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 mt-9 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-xl font-bold text-fg">{children}</h2>
      {actions}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line text-fg-subtle">
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      <div className="text-sm font-semibold text-fg">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-fg-subtle">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-subtle">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
      {message}
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-600 dark:text-blue-300",
  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
  "bg-violet-500/20 text-violet-600 dark:text-violet-300",
  "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300",
  "bg-rose-500/20 text-rose-600 dark:text-rose-300",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const s = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${s} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]}`}>
      {initials(name)}
    </span>
  );
}

export function DescriptionList({
  items,
  cols = 2,
}: {
  items: { label: string; value: React.ReactNode; span?: boolean }[];
  cols?: 1 | 2 | 3;
}) {
  const c = cols === 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : "";
  return (
    <dl className={`grid grid-cols-1 gap-x-10 gap-y-6 ${c}`}>
      {items.map((it) => (
        <div key={it.label} className={it.span ? "md:col-span-full" : ""}>
          <dt className="text-[15px] font-bold text-fg">{it.label}</dt>
          <dd className="mt-1.5 break-words text-[15px] text-fg-muted">{it.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ShareBar({ value, max, tone = "bg-primary" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BarList({ items }: { items: { label: string; value: number; href?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            {it.href ? (
              <Link href={it.href} className="truncate font-medium text-fg hover:text-primary">
                {it.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-fg">{it.label}</span>
            )}
            <span className="tabular-nums text-fg-muted">{it.value}</span>
          </div>
          <ShareBar value={it.value} max={max} />
        </li>
      ))}
    </ul>
  );
}
