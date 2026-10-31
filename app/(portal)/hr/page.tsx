"use client";

import Link from "next/link";
import { Cake, FileText, Network, Palmtree, UserPlus, Users } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { formatDate, formatDateLong, plural } from "@/lib/format";
import { useSession } from "@/components/session";
import { Avatar, BarList, Card, PageHeader, Spinner, StatCard } from "@/components/ui";

interface HrStats {
  total: number;
  probation: number;
  dismissed: number;
  newHires: number;
  onLeaveToday: number;
  departments: number;
  documents: number;
  myEmployees: number;
  headcount: { id: string; label: string; value: number }[];
  birthdays: { id: string; name: string; position: string; date: string; inDays: number }[];
  recentHires: { id: string; name: string; position: string; hireDate: string; department: string }[];
}

export default function HrDashboard() {
  const session = useSession();
  const can = (p: string) => session.permissions.includes(p);
  const { data, loading } = useApi<HrStats>(can("hr.employees.view") ? "/api/hr/stats" : null);

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Персонал" }, { label: "Дашборд" }]} title="Персонал" description="Кадровая сводка по объединению" />
      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Численность" value={data.total} hint={`На испытательном сроке: ${data.probation}`} icon={<Users className="h-5 w-5" />} tone="blue" href="/hr/employees" />
            <StatCard label="Приняты за 30 дней" value={data.newHires} hint="Новые сотрудники" icon={<UserPlus className="h-5 w-5" />} tone="green" />
            <StatCard label="В отпуске сегодня" value={data.onLeaveToday} hint="По согласованным заявлениям" icon={<Palmtree className="h-5 w-5" />} tone="amber" />
            <StatCard label="Мои сотрудники" value={data.myEmployees} hint="Где вы — ответственный HR" icon={<Users className="h-5 w-5" />} tone="violet" href="/hr/employees?mine=1" />
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <StatCard label="Подразделений" value={data.departments} icon={<Network className="h-5 w-5" />} tone="cyan" href={can("hr.departments.view") ? "/hr/departments" : undefined} />
            <StatCard label="Документов в архиве" value={data.documents} icon={<FileText className="h-5 w-5" />} tone="gray" href="/hr/documents" />
          </div>

          <div className="mt-9 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card className="p-6">
              <h3 className="mb-5 text-lg font-bold text-fg">Численность по подразделениям</h3>
              <BarList items={data.headcount.map((h) => ({ label: h.label, value: h.value }))} />
            </Card>
            <div className="flex flex-col gap-6">
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-bold text-fg">Недавно приняты</h3>
                <ul className="flex flex-col gap-3">
                  {data.recentHires.map((h) => (
                    <li key={h.id}>
                      <Link href={`/hr/employees/${h.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-hover">
                        <Avatar name={h.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-fg">{h.name}</div>
                          <div className="truncate text-xs text-fg-subtle">
                            {h.position} · {h.department}
                          </div>
                        </div>
                        <span className="text-xs text-fg-muted">{formatDate(h.hireDate)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-fg">
                  <Cake className="h-5 w-5 text-rose-500" /> Ближайшие дни рождения
                </h3>
                {data.birthdays.length === 0 ? (
                  <p className="text-sm text-fg-subtle">В ближайшие 30 дней нет</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.birthdays.map((b) => (
                      <li key={b.id} className="flex items-center gap-3">
                        <Avatar name={b.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-fg">{b.name}</div>
                          <div className="truncate text-xs text-fg-subtle">{b.position}</div>
                        </div>
                        <span className="text-right text-xs text-fg-muted">
                          {formatDateLong(b.date)}
                          <br />
                          {b.inDays === 0 ? "сегодня" : `через ${b.inDays} ${plural(b.inDays, "день", "дня", "дней")}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
