"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, CalendarClock, CalendarDays, ClipboardCheck, Plus, Sun } from "lucide-react";
import { LEAVE_STATUS, LEAVE_TYPE } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate, plural, todayISO } from "@/lib/format";
import type { LeaveBalance, LeaveDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Avatar, Button, Card, EmptyState, EnumBadge, PageHeader, SectionTitle, ShareBar, StatCard } from "@/components/ui";
import { CreateLeaveModal } from "@/components/vacation/create-leave-modal";
import { LeaveTable } from "@/components/vacation/leave-table";

export default function VacationDashboard() {
  const session = useSession();
  const canRequest = session.permissions.includes("vacation.request");
  const [creating, setCreating] = useState(false);
  const { data: balance, reload: reloadBalance } = useApi<LeaveBalance>("/api/leave/balance");
  const { data: mine, reload } = useApi<LeaveDTO[]>("/api/leave?scope=my");
  const { data: approvals } = useApi<LeaveDTO[]>(session.isApprover ? "/api/leave?scope=approvals" : null);
  const month = todayISO().slice(0, 7);
  const { data: calendar } = useApi<{ employees: { id: string; fullName: string; position: string }[]; leaves: { employeeId: string; type: string; status: string; startDate: string; endDate: string }[] }>(
    `/api/leave/calendar?month=${month}`,
  );

  const today = todayISO();
  const upcoming = (mine ?? []).filter((l) => (l.status === "approved" || l.status === "pending") && l.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const toApprove = (approvals ?? []).filter((l) => l.canApproveAs.length > 0);
  const absentToday = (calendar?.leaves ?? []).filter((l) => l.status === "approved" && l.startDate <= today && l.endDate >= today);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Отпуска" }, { label: "Дашборд" }]}
        title="Отпуска и отсутствия"
        description={`Ваш HR-менеджер и руководитель согласуют заявления. Ежегодный отпуск — ${balance?.entitlement ?? 24} календарных дня.`}
        actions={
          canRequest && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Новое заявление
            </Button>
          )
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Остаток отпуска ${balance?.year ?? ""}`} value={`${balance?.remaining ?? "—"} дн.`} hint={`из ${balance?.entitlement ?? "—"} положенных`} icon={<Sun className="h-5 w-5" />} tone="green" />
        <StatCard label="Использовано" value={`${balance?.used ?? 0} дн.`} hint="Согласованные отпуска" icon={<CalendarCheck className="h-5 w-5" />} tone="blue" />
        <StatCard label="На согласовании" value={`${balance?.pending ?? 0} дн.`} hint="Ожидают решения" icon={<CalendarClock className="h-5 w-5" />} tone="amber" href="/vacation/my" />
        {session.isApprover ? (
          <StatCard label="Ждут вашего решения" value={toApprove.length} hint="Заявления сотрудников" icon={<ClipboardCheck className="h-5 w-5" />} tone="violet" href="/vacation/approvals" />
        ) : (
          <StatCard label="Отсутствуют сегодня" value={absentToday.length} hint="В вашем подразделении" icon={<CalendarDays className="h-5 w-5" />} tone="violet" href="/vacation/calendar" />
        )}
      </div>

      {balance && (
        <Card className="mt-5 p-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-fg">Использование ежегодного отпуска</span>
            <span className="text-fg-muted">
              {balance.used + balance.pending} / {balance.entitlement} дн.
            </span>
          </div>
          <ShareBar value={balance.used + balance.pending} max={balance.entitlement} tone="bg-emerald-500" />
        </Card>
      )}

      <div className="mt-9 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-fg">Мои ближайшие отсутствия</h3>
          {upcoming.length === 0 ? (
            <EmptyState title="Нет запланированных отсутствий" />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <Link href={`/vacation/requests/${l.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <EnumBadge map={LEAVE_TYPE} value={l.type} />
                    <span className="flex-1 text-sm text-fg">
                      {formatDate(l.startDate)} — {formatDate(l.endDate)} <span className="text-fg-subtle">· {l.days} {plural(l.days, "день", "дня", "дней")}</span>
                    </span>
                    <EnumBadge map={LEAVE_STATUS} value={l.status} dot />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-fg">Отсутствуют сегодня</h3>
          {absentToday.length === 0 ? (
            <EmptyState title="Все на месте" description="Сегодня нет согласованных отсутствий в ваших подразделениях" />
          ) : (
            <ul className="flex flex-col gap-3">
              {absentToday.map((l, i) => {
                const emp = calendar?.employees.find((e) => e.id === l.employeeId);
                return (
                  <li key={i} className="flex items-center gap-3">
                    <Avatar name={emp?.fullName ?? "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-fg">{emp?.fullName}</div>
                      <div className="text-xs text-fg-subtle">до {formatDate(l.endDate)}</div>
                    </div>
                    <EnumBadge map={LEAVE_TYPE} value={l.type} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {session.isApprover && (
        <>
          <SectionTitle actions={<Link href="/vacation/approvals" className="text-sm font-semibold text-primary">Все согласования →</Link>}>
            Ожидают вашего решения
          </SectionTitle>
          <LeaveTable rows={toApprove.slice(0, 5)} showEmployee emptyTitle="Нет заявлений на согласование" />
        </>
      )}

      <CreateLeaveModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          reload();
          reloadBalance();
        }}
      />
    </>
  );
}
