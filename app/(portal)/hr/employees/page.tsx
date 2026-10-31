"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Crown, Plus, RefreshCw, Search } from "lucide-react";
import { EMPLOYEE_STATUS, enumOptions } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { EmployeeDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Avatar, Button, Checkbox, DataTable, EnumBadge, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { useDepartmentScope } from "@/components/it/ticket-filters";

export default function EmployeesPage() {
  return (
    <Guard anyOf={["hr.employees.view"]}>
      <Suspense>
        <Employees />
      </Suspense>
    </Guard>
  );
}

function Employees() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const { data, loading, reload } = useApi<EmployeeDTO[]>("/api/hr/employees");
  const { departments, scope } = useDepartmentScope();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(params.get("mine") === "1");

  const rows = useMemo(() => {
    const ids = dept ? new Set(scope(dept)) : null;
    return (data ?? []).filter(
      (e) =>
        (!ids || ids.has(e.departmentId)) &&
        (!status ? e.status !== "dismissed" : e.status === status) &&
        (!mine || e.hrManagerId === session.employee.id) &&
        `${e.fullName} ${e.personnelNumber} ${e.email} ${e.phone} ${e.position}`.toLowerCase().includes(q.toLowerCase()),
    );
  }, [data, dept, status, mine, q, scope, session.employee.id]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Персонал", href: "/hr" }, { label: "Сотрудники" }]}
        title="Сотрудники"
        actions={
          session.permissions.includes("hr.employees.create") && (
            <LinkButton href="/hr/employees/new" variant="success" icon={<Plus className="h-4 w-4" />}>
              Принять сотрудника
            </LinkButton>
          )
        }
      />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(e) => e.id}
        onRowClick={(e) => router.push(`/hr/employees/${e.id}`)}
        emptyTitle="Сотрудники не найдены"
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="ФИО, таб. номер, телефон, email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-64">
              <Select value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Все подразделения" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
            </div>
            <div className="w-48">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Работающие" options={enumOptions(EMPLOYEE_STATUS)} />
            </div>
            <Checkbox checked={mine} onChange={setMine} label="Мои сотрудники" />
            <Button className="ml-auto" icon={<RefreshCw className="h-4 w-4" />} onClick={reload}>
              Обновить
            </Button>
          </>
        }
        columns={[
          {
            key: "name",
            header: "Сотрудник",
            render: (e) => (
              <div className="flex items-center gap-3">
                <Avatar name={e.fullName} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate font-semibold text-fg">
                    {e.fullName}
                    {e.headOf.length > 0 && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Руководитель" />}
                  </div>
                  <div className="truncate text-xs text-fg-subtle">{e.position}</div>
                </div>
              </div>
            ),
          },
          { key: "num", header: "Таб. №", render: (e) => <span className="font-mono text-xs">{e.personnelNumber}</span> },
          { key: "dept", header: "Подразделение", className: "max-w-[240px] truncate", render: (e) => e.departmentName },
          { key: "phone", header: "Телефон", render: (e) => <span className="whitespace-nowrap">{e.phone}</span> },
          { key: "status", header: "Статус", render: (e) => <EnumBadge map={EMPLOYEE_STATUS} value={e.status} dot /> },
          { key: "hr", header: "HR-менеджер", render: (e) => e.hrManager?.shortName ?? "—" },
          { key: "hire", header: "Дата приёма", render: (e) => formatDate(e.hireDate) },
        ]}
      />
    </>
  );
}
