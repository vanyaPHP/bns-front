"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LEAVE_TYPE, type LeaveType } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { todayISO } from "@/lib/format";
import type { EmployeeRef } from "@/lib/types";
import { Button, Card, EmptyState, PageHeader, Select, Spinner } from "@/components/ui";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const CELL: Record<LeaveType, string> = {
  annual: "bg-emerald-500",
  sick: "bg-red-500",
  unpaid: "bg-amber-500",
  study: "bg-violet-500",
};

interface CalendarData {
  month: string;
  departments: { id: string; name: string }[];
  employees: EmployeeRef[];
  leaves: { id: string; employeeId: string; type: LeaveType; status: string; startDate: string; endDate: string }[];
}

export default function CalendarPage() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [departmentId, setDepartmentId] = useState("");
  const { data, loading } = useApi<CalendarData>(`/api/leave/calendar?month=${month}${departmentId ? `&departmentId=${departmentId}` : ""}`);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = todayISO();

  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const iso = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Календарь" }]}
        title="Календарь отсутствий"
        description="Согласованные (сплошная заливка) и ожидающие согласования (штриховка) отсутствия сотрудников"
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button size="icon" onClick={() => shift(-1)} aria-label="Предыдущий месяц">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="w-44 text-center text-lg font-bold text-fg">
          {MONTHS[m - 1]} {y}
        </div>
        <Button size="icon" onClick={() => shift(1)} aria-label="Следующий месяц">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMonth(todayISO().slice(0, 7))}>
          Сегодня
        </Button>
        <div className="ml-auto w-80">
          <Select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="Мои подразделения"
            options={(data?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-fg-muted">
        {(Object.keys(LEAVE_TYPE) as LeaveType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${CELL[t]}`} /> {LEAVE_TYPE[t].label}
          </span>
        ))}
      </div>
      <Card className="overflow-x-auto">
        {loading && !data ? (
          <Spinner />
        ) : !data?.employees.length ? (
          <EmptyState title="Нет сотрудников" />
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="sticky left-0 z-10 min-w-[240px] bg-muted px-4 py-3 text-left font-semibold uppercase tracking-wide text-fg-muted">Сотрудник</th>
                {days.map((d) => {
                  const wd = new Date(y, m - 1, d).getDay();
                  const isToday = iso(d) === today;
                  return (
                    <th key={d} className={`min-w-[30px] px-0.5 py-2 text-center font-medium ${wd === 0 || wd === 6 ? "text-red-400" : "text-fg-muted"}`}>
                      <div className={isToday ? "mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white" : ""}>{d}</div>
                      <div className="text-[9px] font-normal opacity-70">{WEEKDAYS[wd]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => {
                const mine = data.leaves.filter((l) => l.employeeId === e.id);
                return (
                  <tr key={e.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2">
                      <div className="truncate font-semibold text-fg">{e.shortName}</div>
                      <div className="truncate text-[10px] text-fg-subtle">{e.position}</div>
                    </td>
                    {days.map((d) => {
                      const day = iso(d);
                      const leave = mine.find((l) => l.startDate <= day && l.endDate >= day);
                      const wd = new Date(y, m - 1, d).getDay();
                      return (
                        <td key={d} className={`px-0.5 py-2 ${wd === 0 || wd === 6 ? "bg-muted/40" : ""}`}>
                          {leave && (
                            <div
                              title={`${LEAVE_TYPE[leave.type].label}${leave.status === "pending" ? " (на согласовании)" : ""}`}
                              className={`h-5 rounded-sm ${CELL[leave.type]} ${leave.status === "pending" ? "opacity-50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,.5)_3px,rgba(255,255,255,.5)_5px)]" : ""}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
