"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, LifeBuoy, Pin, Plus } from "lucide-react";
import { APPS, canSeeApp } from "@/lib/apps";
import { OPEN_TICKET_STATUSES, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate, greeting } from "@/lib/format";
import type { TicketDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { AppIcon } from "@/components/shell/app-shell";
import { Button, CellTitle, DataTable, EnumBadge, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { CreateTicketModal } from "@/components/it/create-ticket-modal";

export default function HomePage() {
  const session = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { data: tickets, loading, reload } = useApi<TicketDTO[]>("/api/tickets?scope=my");
  const apps = APPS.filter((a) => a.code !== "home" && canSeeApp(a, session));
  const groups = [...new Set(apps.map((a) => a.group))];
  const canCreate = session.permissions.includes("portal.tickets.create");
  const open = (tickets ?? []).filter((t) => OPEN_TICKET_STATUSES.includes(t.status));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Главная" }, { label: "Приложения" }]}
        title={`${greeting()}, ${session.employee.firstName}`}
        description="Ваши приложения и быстрые действия"
        actions={
          canCreate && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Заявка в ИТ-поддержку
            </Button>
          )
        }
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">{g}</h2>
            <div className="flex flex-wrap gap-3">
              {apps
                .filter((a) => a.group === g)
                .map((a) => (
                  <Link
                    key={a.code}
                    href={a.basePath}
                    className="group relative flex h-[118px] w-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-card transition-colors hover:border-line-strong hover:bg-hover"
                  >
                    <span className="absolute left-2.5 top-2.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-500 dark:text-blue-300">
                      MVP
                    </span>
                    <Pin className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-fg-subtle opacity-60" />
                    <AppIcon app={a} size="lg" />
                    <span className="text-[15px] font-semibold text-fg">{a.name}</span>
                  </Link>
                ))}
            </div>
          </section>
        ))}
        {canCreate && (
          <section>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Быстрые действия</h2>
            <button
              onClick={() => setCreating(true)}
              className="flex h-[118px] w-full max-w-[412px] items-center gap-4 rounded-xl border border-dashed border-line-strong bg-card px-6 text-left transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                <LifeBuoy className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-fg">Нужна помощь ИТ?</span>
                <span className="block text-sm text-fg-muted">Создайте заявку по закреплённому оборудованию</span>
              </span>
            </button>
          </section>
        )}
      </div>

      <SectionTitle actions={<LinkButton href="/my/tickets" size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Все заявки</LinkButton>}>
        Мои активные заявки в ИТ
      </SectionTitle>
      <DataTable
        rows={open.slice(0, 6)}
        loading={loading}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/my/tickets/${t.id}`)}
        emptyTitle="Активных заявок нет"
        emptyDescription="Если что-то сломалось — создайте заявку, и инженер возьмёт её в работу"
        columns={[
          { key: "code", header: "Номер", render: (t) => <span className="font-mono text-xs font-semibold text-fg">{t.code}</span> },
          { key: "title", header: "Тема", render: (t) => <CellTitle sub={t.requester?.shortName}>{t.title}</CellTitle> },
          { key: "status", header: "Статус", render: (t) => <EnumBadge map={TICKET_STATUS} value={t.status} dot /> },
          { key: "priority", header: "Приоритет", render: (t) => <EnumBadge map={TICKET_PRIORITY} value={t.priority} /> },
          { key: "assignee", header: "Исполнитель", render: (t) => t.assignee?.shortName ?? "—" },
          { key: "created", header: "Создана", render: (t) => formatDate(t.createdAt) },
        ]}
      />

      <CreateTicketModal open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </>
  );
}
