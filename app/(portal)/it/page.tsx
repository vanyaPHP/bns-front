"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardCheck, Inbox, ShoppingCart, Timer, UserX } from "lucide-react";
import { OPEN_TICKET_STATUSES, TICKET_PRIORITY, TICKET_STATUS, type TicketPriority } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import type { PurchaseDTO, TicketDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { BarList, Card, CellTitle, DataTable, EnumBadge, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export default function ItDashboard() {
  const session = useSession();
  const router = useRouter();
  const can = (p: string) => session.permissions.includes(p);
  const { data: tickets, loading } = useApi<TicketDTO[]>(can("it.tickets.view") ? "/api/tickets?scope=all" : null);
  const { data: purchases } = useApi<PurchaseDTO[]>(can("it.purchases.request") || can("it.purchases.approve") ? "/api/purchases" : null);

  const all = tickets ?? [];
  const open = all.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
  const mine = open.filter((t) => t.assigneeEmployeeId === session.employee.id);
  const unassigned = open.filter((t) => !t.assigneeEmployeeId);
  const resolved = all.filter((t) => t.status === "resolved");
  const critical = open.filter((t) => t.priority === "critical" || t.priority === "high");
  const pendingPurchases = (purchases ?? []).filter((p) => p.status === "in_progress");

  const closed = all.filter((t) => t.closedAt && t.status === "closed");
  const avgHours = closed.length
    ? Math.round(closed.reduce((s, t) => s + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / closed.length / 3_600_000)
    : 0;

  const byDept = Object.entries(
    open.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.departmentName]: (acc[t.departmentName] ?? 0) + 1 }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const byEngineer = Object.entries(
    open.reduce<Record<string, number>>((acc, t) => {
      const k = t.assignee?.shortName ?? "Не назначены";
      return { ...acc, [k]: (acc[k] ?? 0) + 1 };
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "ИТ-поддержка" }, { label: "Дашборд" }]}
        title="ИТ-поддержка"
        description="Оперативная сводка по заявкам, исполнителям и закупкам"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Открытые заявки" value={open.length} hint={`Мои в работе: ${mine.length}`} icon={<Inbox className="h-5 w-5" />} tone="blue" href="/it/board" />
        <StatCard label="Без исполнителя" value={unassigned.length} hint="Требуют назначения" icon={<UserX className="h-5 w-5" />} tone="amber" href="/it/board" />
        <StatCard
          label="Ожидают проверки"
          value={resolved.length}
          hint="Приёмка начальником ИТ-поддержки"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="cyan"
          href={can("it.tickets.verify") ? "/it/verification" : undefined}
        />
        <StatCard
          label="Закупки на согласовании"
          value={pendingPurchases.length}
          hint={formatMoney(pendingPurchases.reduce((s, p) => s + p.total, 0))}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="violet"
          href="/it/purchases"
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <StatCard label="Высокий и критический приоритет" value={critical.length} hint="Среди открытых заявок" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        <StatCard label="Среднее время решения" value={`${avgHours} ч`} hint={`По ${closed.length} закрытым заявкам`} icon={<Timer className="h-5 w-5" />} tone="green" />
      </div>

      <div className="mt-9 grid gap-6 xl:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-5 text-lg font-bold text-fg">По статусам</h3>
          <BarList
            items={(Object.keys(TICKET_STATUS) as (keyof typeof TICKET_STATUS)[]).map((s) => ({
              label: TICKET_STATUS[s].label,
              value: all.filter((t) => t.status === s).length,
            }))}
          />
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 text-lg font-bold text-fg">Открытые по подразделениям</h3>
          {byDept.length ? <BarList items={byDept} /> : <p className="text-sm text-fg-subtle">Нет открытых заявок</p>}
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 text-lg font-bold text-fg">Загрузка инженеров</h3>
          {byEngineer.length ? <BarList items={byEngineer} /> : <p className="text-sm text-fg-subtle">Нет открытых заявок</p>}
        </Card>
      </div>

      <SectionTitle actions={<Link href="/it/tickets" className="text-sm font-semibold text-primary">Все заявки →</Link>}>
        Срочные открытые заявки
      </SectionTitle>
      <DataTable
        rows={[...open].sort((a, b) => prio(b.priority) - prio(a.priority) || a.createdAt.localeCompare(b.createdAt)).slice(0, 8)}
        loading={loading}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/it/tickets/${t.id}`)}
        emptyTitle="Открытых заявок нет"
        columns={[
          { key: "code", header: "Номер", render: (t) => <span className="font-mono text-xs font-semibold text-fg">{t.code}</span> },
          { key: "title", header: "Тема", render: (t) => <CellTitle sub={t.departmentName}>{t.title}</CellTitle> },
          { key: "priority", header: "Приоритет", render: (t) => <EnumBadge map={TICKET_PRIORITY} value={t.priority} /> },
          { key: "status", header: "Статус", render: (t) => <EnumBadge map={TICKET_STATUS} value={t.status} dot /> },
          { key: "assignee", header: "Исполнитель", render: (t) => t.assignee?.shortName ?? <span className="text-amber-500">Не назначен</span> },
          { key: "created", header: "Создана", render: (t) => formatDate(t.createdAt) },
        ]}
      />
    </>
  );
}

function prio(p: TicketPriority) {
  return ["low", "medium", "high", "critical"].indexOf(p);
}
