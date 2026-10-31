"use client";

import { HardDrive, Mail, Building2, BadgeCheck } from "lucide-react";
import { HARDWARE_STATUS, HARDWARE_TYPE } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { HardwareDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Avatar, Card, DataTable, EnumBadge, PageHeader, SectionTitle } from "@/components/ui";

export default function MyHardwarePage() {
  const session = useSession();
  const { data, loading } = useApi<HardwareDTO[]>("/api/my/hardware");
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Моё оборудование" }]} title="Профиль и оборудование" />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar name={session.employee.fullName} size="lg" />
            <div className="mt-3 text-lg font-bold text-fg">{session.employee.fullName}</div>
            <div className="text-sm text-fg-muted">{session.employee.position}</div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-sm">
            <div className="flex items-center gap-3 text-fg-muted">
              <Building2 className="h-4 w-4 shrink-0" /> {session.employee.departmentName}
            </div>
            <div className="flex items-center gap-3 text-fg-muted">
              <Mail className="h-4 w-4 shrink-0" /> {session.employee.email}
            </div>
            <div className="flex items-start gap-3 text-fg-muted">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {session.roles.map((r) => (
                  <span key={r.id} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-fg-muted" /> Закреплённое оборудование
            </span>
          </SectionTitle>
          <DataTable
            rows={data}
            loading={loading}
            rowKey={(h) => h.id}
            emptyTitle="За вами не закреплено оборудование"
            emptyDescription="Выдачу оборудования выполняет служба технической поддержки"
            columns={[
              { key: "inv", header: "Инв. номер", render: (h) => <span className="font-mono text-xs font-semibold text-fg">{h.inventoryNumber}</span> },
              { key: "type", header: "Тип", render: (h) => <EnumBadge map={HARDWARE_TYPE} value={h.type} /> },
              { key: "model", header: "Модель", render: (h) => <span className="text-fg">{h.manufacturer} {h.model}</span> },
              { key: "sn", header: "Серийный №", render: (h) => <span className="font-mono text-xs">{h.serialNumber}</span> },
              { key: "status", header: "Статус", render: (h) => <EnumBadge map={HARDWARE_STATUS} value={h.status} dot /> },
              { key: "since", header: "Выдано", render: (h) => formatDate(h.assignedAt) },
            ]}
          />
        </div>
      </div>
    </>
  );
}
