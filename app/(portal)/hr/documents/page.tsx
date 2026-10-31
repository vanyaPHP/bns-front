"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Eye, Search } from "lucide-react";
import { DOCUMENT_TYPE, enumOptions } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDateTime, formatSize } from "@/lib/format";
import type { DocumentDTO } from "@/lib/types";
import { Guard } from "@/components/session";
import { CellTitle, DataTable, EnumBadge, Input, PageHeader, Select } from "@/components/ui";

export default function DocumentsPage() {
  return (
    <Guard anyOf={["hr.employees.view"]}>
      <Documents />
    </Guard>
  );
}

function Documents() {
  const { data, loading } = useApi<DocumentDTO[]>("/api/hr/documents");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const rows = (data ?? []).filter(
    (d) => (!type || d.type === type) && `${d.title} ${d.fileName} ${d.employee?.fullName ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Персонал", href: "/hr" }, { label: "Документы" }]}
        title="Архив документов"
        description="Все документы, загруженные в карточки сотрудников"
      />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(d) => d.id}
        emptyTitle="Документов пока нет"
        emptyDescription="Документы загружаются при приёме сотрудника или в его карточке на вкладке «Документы»"
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Название, файл, сотрудник…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-60">
              <Select value={type} onChange={(e) => setType(e.target.value)} placeholder="Все типы" options={enumOptions(DOCUMENT_TYPE)} />
            </div>
          </>
        }
        columns={[
          { key: "title", header: "Документ", render: (d) => <CellTitle sub={`${d.fileName} · ${formatSize(d.size)}`}>{d.title}</CellTitle> },
          { key: "type", header: "Тип", render: (d) => <EnumBadge map={DOCUMENT_TYPE} value={d.type} /> },
          {
            key: "emp",
            header: "Сотрудник",
            render: (d) =>
              d.employee && (
                <Link href={`/hr/employees/${d.employee.id}`} className="hover:text-primary">
                  <CellTitle sub={d.employee.departmentName}>{d.employee.fullName}</CellTitle>
                </Link>
              ),
          },
          { key: "by", header: "Загрузил", render: (d) => d.uploadedBy },
          { key: "at", header: "Дата", render: (d) => formatDateTime(d.createdAt) },
          {
            key: "a",
            header: "",
            render: (d) => (
              <div className="flex justify-end gap-1">
                <a href={`/api/hr/documents/${d.id}?inline=1`} target="_blank" rel="noreferrer" className="rounded-md p-2 text-fg-subtle hover:bg-hover hover:text-fg" title="Открыть">
                  <Eye className="h-4 w-4" />
                </a>
                <a href={`/api/hr/documents/${d.id}`} className="rounded-md p-2 text-fg-subtle hover:bg-hover hover:text-fg" title="Скачать">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
