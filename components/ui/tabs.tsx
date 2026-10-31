"use client";

import Link from "next/link";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: React.ReactNode; count?: number; href?: string }[];
  value: T;
  onChange?: (v: T) => void;
}) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t.value === value;
        const cls = `relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors ${
          active ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg"
        }`;
        const content = (
          <>
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 py-px text-[11px] ${active ? "bg-primary-soft" : "bg-muted"}`}>{t.count}</span>
            )}
          </>
        );
        return t.href ? (
          <Link key={t.value} href={t.href} className={cls}>
            {content}
          </Link>
        ) : (
          <button key={t.value} className={cls} onClick={() => onChange?.(t.value)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
