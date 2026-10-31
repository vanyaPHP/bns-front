"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { LEAVE_STATUS, LEAVE_TYPE, enumOptions } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import type { LeaveDTO } from "@/lib/types";
import { Guard } from "@/components/session";
import { Input, PageHeader, Select } from "@/components/ui";
import { LeaveTable } from "@/components/vacation/leave-table";

export default function AllLeavePage() {
  return (
    <Guard anyOf={["vacation.view_all"]}>
      <AllLeave />
    </Guard>
  );
}

function AllLeave() {
  const { data, loading } = useApi<LeaveDTO[]>("/api/leave?scope=all");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const rows = (data ?? []).filter(
    (l) =>
      (!type || l.type === type) &&
      (!status || l.status === status) &&
      `${l.employee?.fullName} ${l.employee?.departmentName} ${l.number}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Все заявления" }]} title="Все заявления" description="Реестр заявлений всех сотрудников объединения" />
      <LeaveTable
        rows={rows}
        loading={loading}
        showEmployee
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Сотрудник, подразделение, номер…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-56">
              <Select value={type} onChange={(e) => setType(e.target.value)} placeholder="Все типы" options={enumOptions(LEAVE_TYPE)} />
            </div>
            <div className="w-48">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Все статусы" options={enumOptions(LEAVE_STATUS)} />
            </div>
          </>
        }
      />
    </>
  );
}
