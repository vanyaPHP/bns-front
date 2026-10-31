"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { OPEN_TICKET_STATUSES, TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS, enumLabel } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { TicketDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Button, CellTitle, DataTable, EnumBadge, Input, PageHeader, Tabs } from "@/components/ui";
import { CreateTicketModal } from "@/components/it/create-ticket-modal";

export default function MyTicketsPage() {
  const router = useRouter();
  const session = useSession();
  const { data, loading, reload } = useApi<TicketDTO[]>("/api/tickets?scope=my");
  const [tab, setTab] = useState<"open" | "all">("open");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const isHead = session.headOfDepartmentIds.length > 0;

  const rows = (data ?? [])
    .filter((t) => tab === "all" || OPEN_TICKET_STATUSES.includes(t.status))
    .filter((t) => `${t.code} ${t.title} ${t.requester?.fullName}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Мои заявки в ИТ" }]}
        title="Мои заявки в ИТ"
        description={isHead ? "Ваши заявки и заявки сотрудников подразделений, которыми вы руководите" : "Обращения в службу технической поддержки"}
        actions={
          session.permissions.includes("portal.tickets.create") && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Новая заявка
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "open", label: "Активные", count: (data ?? []).filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length },
          { value: "all", label: "Все", count: data?.length ?? 0 },
        ]}
      />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/my/tickets/${t.id}`)}
        emptyTitle="Заявок не найдено"
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Поиск по номеру, теме, заявителю…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button className="ml-auto" icon={<RefreshCw className="h-4 w-4" />} onClick={reload}>
              Обновить
            </Button>
          </>
        }
        columns={[
          { key: "code", header: "Номер", render: (t) => <span className="font-mono text-xs font-semibold text-fg">{t.code}</span> },
          { key: "title", header: "Тема", render: (t) => <CellTitle sub={enumLabel(TICKET_CATEGORY, t.category)}>{t.title}</CellTitle> },
          { key: "requester", header: "Заявитель", render: (t) => t.requester?.shortName },
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
