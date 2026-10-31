"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, FilterX, RefreshCw, Search } from "lucide-react";
import { APP_LABELS, type AppCode } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import type { AuditLogDTO } from "@/lib/types";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Spinner } from "@/components/ui";

const FIELD_LABELS: Record<string, string> = {
  status: "Статус",
  priority: "Приоритет",
  assigneeEmployeeId: "Исполнитель",
  resolution: "Решение",
  resolvedAt: "Выполнена",
  closedAt: "Закрыта",
  verifiedByUserId: "Приёмка",
  employeeId: "Сотрудник",
  assignedAt: "Дата выдачи",
  inventoryNumber: "Инв. номер",
  model: "Модель",
  manufacturer: "Производитель",
  serialNumber: "Серийный №",
  notes: "Примечание",
  roleIds: "Роли",
  isActive: "Активен",
  login: "Логин",
  permissions: "Права",
  name: "Название",
  code: "Код",
  description: "Описание",
  lastName: "Фамилия",
  firstName: "Имя",
  middleName: "Отчество",
  position: "Должность",
  departmentId: "Подразделение",
  phone: "Телефон",
  email: "Email",
  headEmployeeId: "Руководитель",
  parentId: "Вышестоящее",
  hrManagerId: "HR-менеджер",
  bank: "Банковские реквизиты",
  passport: "Паспорт",
  registrationAddress: "Адрес регистрации",
  residentialAddress: "Адрес проживания",
  headApproval: "Согласование руководителя",
  hrApproval: "Согласование HR",
};

const TONE_BY_APP: Record<AppCode, "gray" | "green" | "violet" | "amber"> = { admin: "gray", hr: "green", it: "violet", vacation: "amber" };

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Да" : "Нет";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return Object.values(v as object).filter(Boolean).join(", ") || "—";
  return String(v);
}

export function AuditLogView({ app, breadcrumbs }: { app?: AppCode; breadcrumbs: { label: string; href?: string }[] }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appFilter, setAppFilter] = useState<string>(app ?? "");
  const [expanded, setExpanded] = useState<string | null>(null);
  const params = new URLSearchParams();
  if (appFilter) params.set("app", appFilter);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const { data, loading, reload, error } = useApi<AuditLogDTO[]>(`/api/audit?${params}`);
  const rows = (data ?? []).filter((l) => !q || `${l.summary} ${l.action} ${l.user?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} title="Журнал аудита" description="Все значимые действия пользователей с фиксацией изменений" />
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <div className="w-full max-w-sm">
            <Input icon={<Search className="h-4 w-4" />} placeholder="Поиск по действию, пользователю…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!app && (
            <div className="w-52">
              <Select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                placeholder="Все приложения"
                options={(Object.keys(APP_LABELS) as AppCode[]).map((a) => ({ value: a, label: APP_LABELS[a] }))}
              />
            </div>
          )}
          <div className="w-40">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="С даты" />
          </div>
          <div className="w-40">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="По дату" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<FilterX className="h-4 w-4" />}
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
                setAppFilter(app ?? "");
              }}
            >
              Сбросить
            </Button>
            <Button size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={reload}>
              Обновить
            </Button>
          </div>
        </div>
        {error && <div className="px-6 pb-4 text-sm text-red-500">{error}</div>}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="w-10 px-4 py-3.5" />
              <th className="px-4 py-3.5">Дата и время</th>
              {!app && <th className="px-4 py-3.5">Приложение</th>}
              <th className="px-4 py-3.5">Пользователь</th>
              <th className="px-4 py-3.5">Действие</th>
              <th className="px-4 py-3.5">Описание</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((l) => {
              const open = expanded === l.id;
              const hasChanges = !!l.changes && Object.keys(l.changes).length > 0;
              return (
                <Fragment key={l.id}>
                  <tr
                    className={`border-t border-line ${hasChanges ? "cursor-pointer hover:bg-hover" : ""}`}
                    onClick={() => hasChanges && setExpanded(open ? null : l.id)}
                  >
                    <td className="px-4 py-3.5 text-fg-subtle">{hasChanges && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-fg-muted">{formatDateTime(l.createdAt)}</td>
                    {!app && (
                      <td className="px-4 py-3.5">
                        <Badge tone={TONE_BY_APP[l.app]}>{APP_LABELS[l.app]}</Badge>
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      {l.user ? (
                        <div>
                          <div className="font-semibold text-fg">{l.user.name}</div>
                          <div className="font-mono text-xs text-fg-subtle">{l.user.login}</div>
                        </div>
                      ) : (
                        <span className="text-fg-subtle">Система</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-fg-muted">{l.action}</span>
                    </td>
                    <td className="px-4 py-3.5 text-fg">{l.summary}</td>
                  </tr>
                  {open && l.changes && (
                    <tr className="border-t border-line bg-muted/40">
                      <td />
                      <td colSpan={app ? 4 : 5} className="px-4 py-3">
                        <div className="grid gap-1.5 text-xs">
                          {Object.entries(l.changes).map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[180px_1fr] gap-3">
                              <span className="font-semibold text-fg-muted">{FIELD_LABELS[k] ?? k}</span>
                              <span>
                                <span className="text-red-500 line-through decoration-red-500/40">{show(v.from)}</span>
                                <span className="mx-2 text-fg-subtle">→</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{show(v.to)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {loading && <Spinner />}
        {!loading && rows.length === 0 && <EmptyState title="Записей не найдено" />}
        {rows.length > 300 && <div className="border-t border-line px-6 py-3 text-xs text-fg-subtle">Показаны последние 300 из {rows.length} записей. Уточните фильтр.</div>}
      </div>
    </>
  );
}
