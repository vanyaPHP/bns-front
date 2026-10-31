import type { EnumOption, Tone } from "@/lib/enums";

const TONES: Record<Tone, string> = {
  gray: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 ring-zinc-500/25",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  red: "bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/30",
  cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-cyan-500/30",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30",
};

export const DOT: Record<Tone, string> = {
  gray: "bg-zinc-400",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

export function Badge({
  tone = "gray",
  children,
  dot,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}

/** Renders a badge for an enum value using the label/tone mapping from lib/enums. */
export function EnumBadge<T extends Record<string, EnumOption>>({
  map,
  value,
  dot,
}: {
  map: T;
  value: string | null | undefined;
  dot?: boolean;
}) {
  if (!value) return <span className="text-fg-subtle">—</span>;
  const opt = (map as Record<string, EnumOption>)[value];
  return (
    <Badge tone={opt?.tone ?? "gray"} dot={dot}>
      {opt?.label ?? value}
    </Badge>
  );
}
