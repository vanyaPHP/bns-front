"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS, enumLabel } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import type { TicketDTO } from "@/lib/types";
import { Button, CellTitle, DataTable, EnumBadge, PageHeader } from "@/components/ui";
import { EMPTY_FILTERS, TicketFilters, applyTicketFilters, useDepartmentScope } from "@/components/it/ticket-filters";

function exportCsv(rows: TicketDTO[]) {
  const head = ["Номер", "Тема", "Категория", "Приоритет", "Статус", "Заявитель", "Подразделение", "Исполнитель", "Оборудование", "Создана"];
  const lines = rows.map((t) =>
    [
      t.code,
      t.title,
      enumLabel(TICKET_CATEGORY, t.category),
      enumLabel(TICKET_PRIORITY, t.priority),
      enumLabel(TICKET_STATUS, t.status),
      t.requester?.fullName ?? "",
      t.departmentName,
      t.assignee?.fullName ?? "",
      t.hardware?.inventoryNumber ?? "",
      formatDateTime(t.createdAt),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export function TicketList({ title, preset, breadcrumb }: { title: string; preset?: Partial<typeof EMPTY_FILTERS>; breadcrumb: string }) {
  const router = useRouter();
  const { data, loading, reload } = useApi<TicketDTO[]>("/api/tickets?scope=all");
  const { departments, scope } = useDepartmentScope();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...preset });
  const rows = applyTicketFilters(data ?? [], filters, scope);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "ИТ-поддержка", href: "/it" }, { label: breadcrumb }]}
        title={title}
        actions={
          <Button icon={<Download className="h-4 w-4" />} onClick={() => exportCsv(rows)}>
            Выгрузить CSV
          </Button>
        }
      />
      <TicketFilters value={filters} onChange={setFilters} onRefresh={reload} departments={departments} total={data?.length ?? 0} shown={rows.length} />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/it/tickets/${t.id}`)}
        emptyTitle="Заявки не найдены"
        emptyDescription="Измените условия фильтрации"
        columns={[
          { key: "code", header: "Номер", render: (t) => <span className="font-mono text-xs font-semibold text-fg">{t.code}</span> },
          { key: "title", header: "Тема", className: "max-w-[320px]", render: (t) => <CellTitle sub={enumLabel(TICKET_CATEGORY, t.category)}>{t.title}</CellTitle> },
          { key: "status", header: "Статус", render: (t) => <EnumBadge map={TICKET_STATUS} value={t.status} dot /> },
          { key: "priority", header: "Приоритет", render: (t) => <EnumBadge map={TICKET_PRIORITY} value={t.priority} /> },
          { key: "requester", header: "Заявитель", render: (t) => <CellTitle sub={t.departmentName}>{t.requester?.shortName}</CellTitle> },
          { key: "assignee", header: "Исполнитель", render: (t) => t.assignee?.shortName ?? <span className="text-fg-subtle">Не назначен</span> },
          { key: "created", header: "Создана", render: (t) => formatDate(t.createdAt) },
        ]}
      />
    </>
  );
}
