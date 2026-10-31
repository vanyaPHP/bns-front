"use client";

import { useState } from "react";
import { ChevronDown, Filter, FilterX, RefreshCw, Search } from "lucide-react";
import {
  TICKET_CATEGORY,
  TICKET_PRIORITY,
  TICKET_STATUS,
  type EnumOption,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import type { Department, EmployeeRef, TicketDTO } from "@/lib/types";
import { DOT, Button, Field, Input, Select } from "@/components/ui";

export interface TicketFilterState {
  q: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  categories: TicketCategory[];
  departmentId: string;
  assignee: string; // "" any, "none" unassigned, else employee id
  from: string;
  to: string;
}

export const EMPTY_FILTERS: TicketFilterState = {
  q: "",
  statuses: [],
  priorities: [],
  categories: [],
  departmentId: "",
  assignee: "",
  from: "",
  to: "",
};

export function applyTicketFilters(rows: TicketDTO[], f: TicketFilterState, departmentScope?: (id: string) => string[]) {
  const q = f.q.trim().toLowerCase();
  const deptIds = f.departmentId ? new Set(departmentScope ? departmentScope(f.departmentId) : [f.departmentId]) : null;
  return rows.filter((t) => {
    if (q && !`${t.code} ${t.title} ${t.description} ${t.requester?.fullName} ${t.hardware?.inventoryNumber ?? ""}`.toLowerCase().includes(q)) return false;
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.categories.length && !f.categories.includes(t.category)) return false;
    if (deptIds && !deptIds.has(t.departmentId)) return false;
    if (f.assignee === "none" && t.assigneeEmployeeId) return false;
    if (f.assignee && f.assignee !== "none" && t.assigneeEmployeeId !== f.assignee) return false;
    const day = t.createdAt.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
}

function countActive(f: TicketFilterState) {
  return (
    f.statuses.length +
    f.priorities.length +
    f.categories.length +
    (f.departmentId ? 1 : 0) +
    (f.assignee ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0)
  );
}

function Chips<T extends string>({ map, value, onChange, exclude = [] }: { map: Record<T, EnumOption>; value: T[]; onChange: (v: T[]) => void; exclude?: T[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(map) as T[])
        .filter((k) => !exclude.includes(k))
        .map((k) => {
          const active = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(active ? value.filter((x) => x !== k) : [...value, k])}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "border-primary bg-primary-soft text-primary" : "border-line text-fg-muted hover:bg-hover hover:text-fg"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[map[k].tone]}`} />
              {map[k].label}
            </button>
          );
        })}
    </div>
  );
}

/** Builds a "department + all sub-departments" resolver for filtering. */
export function useDepartmentScope() {
  const { data: departments } = useApi<Pick<Department, "id" | "name" | "parentId" | "shortName">[]>("/api/lookup/departments");
  const scope = (rootId: string) => {
    const out = [rootId];
    for (let i = 0; i < out.length; i++) for (const d of departments ?? []) if (d.parentId === out[i]) out.push(d.id);
    return out;
  };
  return { departments: departments ?? [], scope };
}

export function TicketFilters({
  value,
  onChange,
  onRefresh,
  departments,
  hideStatuses,
  total,
  shown,
  extra,
}: {
  value: TicketFilterState;
  onChange: (f: TicketFilterState) => void;
  onRefresh: () => void;
  departments: Pick<Department, "id" | "name" | "parentId">[];
  hideStatuses?: boolean;
  total: number;
  shown: number;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: engineers } = useApi<EmployeeRef[]>("/api/lookup/engineers");
  const active = countActive(value);
  const set = <K extends keyof TicketFilterState>(k: K, v: TicketFilterState[K]) => onChange({ ...value, [k]: v });

  const depth = (id: string | null): number => {
    let n = 0;
    let cur = departments.find((d) => d.id === id);
    while (cur?.parentId) {
      n++;
      cur = departments.find((d) => d.id === cur!.parentId);
    }
    return n;
  };
  const ordered: typeof departments = [];
  const walk = (parentId: string | null) =>
    departments
      .filter((d) => d.parentId === parentId)
      .forEach((d) => {
        ordered.push(d);
        walk(d.id);
      });
  walk(null);

  return (
    <div className="mb-5 rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-[260px] flex-1">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Поиск по номеру, теме, заявителю, инв. номеру…"
            value={value.q}
            onChange={(e) => set("q", e.target.value)}
          />
        </div>
        <span className="text-xs text-fg-subtle">
          Показано {shown} из {total}
        </span>
        {extra}
        <Button variant="ghost" size="sm" icon={<FilterX className="h-4 w-4" />} disabled={!active && !value.q} onClick={() => onChange(EMPTY_FILTERS)}>
          Сбросить
        </Button>
        <Button size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh}>
          Обновить
        </Button>
        <Button size="sm" variant={open || active ? "outline-primary" : "secondary"} icon={<Filter className="h-4 w-4" />} onClick={() => setOpen((o) => !o)}>
          Фильтры
          {active > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{active}</span>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </div>
      {open && (
        <div className="animate-in grid gap-5 border-t border-line px-4 py-5 md:grid-cols-2 xl:grid-cols-4">
          {!hideStatuses && (
            <Field label="Статус" group className="md:col-span-2">
              <Chips map={TICKET_STATUS} value={value.statuses} onChange={(v) => set("statuses", v)} />
            </Field>
          )}
          <Field label="Приоритет" group className="md:col-span-2">
            <Chips map={TICKET_PRIORITY} value={value.priorities} onChange={(v) => set("priorities", v)} />
          </Field>
          <Field label="Категория" group className="md:col-span-2">
            <Chips map={TICKET_CATEGORY} value={value.categories} onChange={(v) => set("categories", v)} />
          </Field>
          <Field label="Подразделение" hint="Включая вложенные подразделения">
            <Select
              value={value.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              placeholder="Все подразделения"
              options={ordered.map((d) => ({ value: d.id, label: `${"\u00A0\u00A0".repeat(depth(d.id))}${d.name}` }))}
            />
          </Field>
          <Field label="Исполнитель">
            <Select
              value={value.assignee}
              onChange={(e) => set("assignee", e.target.value)}
              placeholder="Любой"
              options={[{ value: "none", label: "— Не назначен —" }, ...(engineers ?? []).map((e) => ({ value: e.id, label: e.fullName }))]}
            />
          </Field>
          <Field label="Создана с">
            <Input type="date" value={value.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
          <Field label="Создана по">
            <Input type="date" value={value.to} onChange={(e) => set("to", e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}
