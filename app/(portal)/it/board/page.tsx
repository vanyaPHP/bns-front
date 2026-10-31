"use client";

import Link from "next/link";
import { useState } from "react";
import { HardDrive, UserRound } from "lucide-react";
import { TICKET_PRIORITY, TICKET_STATUS, type TicketStatus } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { TicketDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Avatar, Checkbox, DOT, EnumBadge, PageHeader, Spinner, useToast } from "@/components/ui";
import { EMPTY_FILTERS, TicketFilters, applyTicketFilters, useDepartmentScope } from "@/components/it/ticket-filters";

const COLUMNS: TicketStatus[] = ["new", "in_progress", "waiting_purchase", "resolved", "closed"];

export default function BoardPage() {
  return (
    <Guard anyOf={["it.tickets.view"]}>
      <Board />
    </Guard>
  );
}

function Board() {
  const session = useSession();
  const toast = useToast();
  const { data, loading, reload } = useApi<TicketDTO[]>("/api/tickets?scope=all");
  const { departments, scope } = useDepartmentScope();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showCancelled, setShowCancelled] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TicketStatus | null>(null);

  const rows = applyTicketFilters(data ?? [], filters, scope);
  const columns = showCancelled ? [...COLUMNS, "cancelled" as TicketStatus] : COLUMNS;
  const can = (p: string) => session.permissions.includes(p);

  const onDrop = async (target: TicketStatus) => {
    setOver(null);
    const t = data?.find((x) => x.id === dragId);
    setDragId(null);
    if (!t || t.status === target) return;
    let action: string | null = null;
    if (t.status === "new" && target === "in_progress" && can("it.tickets.work")) action = "take";
    if (t.status === "resolved" && target === "closed" && can("it.tickets.verify")) action = "verify";
    if (!action) {
      toast.error("Этот переход выполняется из карточки заявки");
      return;
    }
    try {
      await apiFetch(`/api/tickets/${t.id}`, { method: "PATCH", body: { action } });
      toast.success(action === "take" ? `${t.code} взята в работу` : `${t.code} закрыта`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "ИТ-поддержка", href: "/it" }, { label: "Доска заявок" }]}
        title="Доска заявок"
        description="Перетащите новую заявку в «В работе», чтобы взять её, или решённую — в «Закрыта», чтобы подтвердить выполнение. Каждое действие фиксируется в журнале."
      />
      <TicketFilters
        value={filters}
        onChange={setFilters}
        onRefresh={reload}
        departments={departments}
        hideStatuses
        total={data?.length ?? 0}
        shown={rows.length}
        extra={
          <div className="flex items-center gap-4">
            <Checkbox
              checked={filters.assignee === session.employee.id}
              onChange={(v) => setFilters({ ...filters, assignee: v ? session.employee.id : "" })}
              label="Мои"
            />
            <Checkbox checked={showCancelled} onChange={setShowCancelled} label="Отменённые" />
          </div>
        }
      />
      {loading && !data ? (
        <Spinner />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((status) => {
            const items = rows.filter((t) => t.status === status);
            const tone = TICKET_STATUS[status].tone;
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(status);
                }}
                onDragLeave={() => setOver((o) => (o === status ? null : o))}
                onDrop={() => onDrop(status)}
                className={`flex w-[290px] shrink-0 flex-col rounded-xl border bg-card transition-colors ${over === status ? "border-primary" : "border-line"}`}
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} />
                  <span className="text-sm font-bold text-fg">{TICKET_STATUS[status].label}</span>
                  <span className="ml-auto rounded-full border border-line px-2 text-xs text-fg-muted">{items.length}</span>
                </div>
                <div className="flex max-h-[calc(100vh-330px)] min-h-[120px] flex-col gap-2.5 overflow-y-auto px-3 pb-3">
                  {items.length === 0 && (
                    <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-line text-xs text-fg-subtle">Нет заявок</div>
                  )}
                  {items.map((t) => (
                    <Link
                      key={t.id}
                      href={`/it/tickets/${t.id}`}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`group rounded-lg border border-line bg-bg p-3 transition-all hover:border-line-strong ${dragId === t.id ? "opacity-50" : ""}`}
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-fg-subtle">{t.code}</span>
                        <span className="ml-auto">
                          <EnumBadge map={TICKET_PRIORITY} value={t.priority} />
                        </span>
                      </div>
                      <div className="line-clamp-2 text-sm font-semibold text-fg group-hover:text-primary">{t.title}</div>
                      <div className="mt-2 truncate text-xs text-fg-subtle">{t.departmentName}</div>
                      {t.hardware && (
                        <div className="mt-1 flex items-center gap-1 truncate text-xs text-fg-subtle">
                          <HardDrive className="h-3 w-3 shrink-0" /> {t.hardware.inventoryNumber}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs text-fg-muted">
                        <span className="flex items-center gap-1 truncate">
                          <UserRound className="h-3 w-3 shrink-0" />
                          {t.requester?.shortName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {formatDate(t.createdAt).slice(0, 5)}
                          {t.assignee ? (
                            <span title={t.assignee.fullName}>
                              <Avatar name={t.assignee.fullName} size="sm" />
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line-strong text-[10px]" title="Не назначен">
                              ?
                            </span>
                          )}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
