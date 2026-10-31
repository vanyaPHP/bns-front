"use client";

import Link from "next/link";
import { BadgeCheck, LogIn, UserCheck, UserX, Users } from "lucide-react";
import { APP_LABELS } from "@/lib/enums";
import { useApi } from "@/lib/api-client";
import { formatDateTime, todayISO } from "@/lib/format";
import type { AuditLogDTO, RoleDTO, UserDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Badge, BarList, Card, PageHeader, StatCard } from "@/components/ui";

export default function AdminDashboard() {
  const session = useSession();
  const can = (p: string) => session.permissions.includes(p);
  const { data: users } = useApi<UserDTO[]>(can("admin.users.view") ? "/api/admin/users" : null);
  const { data: roles } = useApi<RoleDTO[]>(can("admin.roles.view") ? "/api/admin/roles" : null);
  const { data: logs } = useApi<AuditLogDTO[]>(can("admin.audit.view") ? "/api/audit?limit=200" : null);

  const today = todayISO();
  const logins = (logs ?? []).filter((l) => l.action === "auth.login" && l.createdAt.slice(0, 10) === today);

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Администрирование" }, { label: "Дашборд" }]} title="Администрирование" description="Учётные записи, роли и контроль доступа" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Учётных записей" value={users?.length ?? "—"} icon={<Users className="h-5 w-5" />} tone="blue" href="/admin/users" />
        <StatCard label="Активные" value={users?.filter((u) => u.isActive).length ?? "—"} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <StatCard label="Заблокированные" value={users?.filter((u) => !u.isActive).length ?? "—"} icon={<UserX className="h-5 w-5" />} tone="red" />
        <StatCard label="Ролей" value={roles?.length ?? "—"} hint={`Системных: ${roles?.filter((r) => r.isSystem).length ?? 0}`} icon={<BadgeCheck className="h-5 w-5" />} tone="violet" href="/admin/roles" />
      </div>
      <div className="mt-9 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <h3 className="mb-5 text-lg font-bold text-fg">Пользователи по ролям</h3>
          <BarList items={(roles ?? []).map((r) => ({ label: r.name, value: r.userCount, href: `/admin/roles/${r.id}` })).sort((a, b) => b.value - a.value)} />
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-fg">Последние события</h3>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <LogIn className="h-3.5 w-3.5" /> Входов сегодня: {logins.length}
            </span>
          </div>
          <ul className="divide-y divide-line">
            {(logs ?? []).slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-2.5 text-sm">
                <Badge tone="gray" className="mt-0.5">
                  {APP_LABELS[l.app]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-fg">{l.summary}</div>
                  <div className="text-xs text-fg-subtle">
                    {l.user?.name ?? "Система"} · {formatDateTime(l.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {can("admin.audit.view") && (
            <Link href="/admin/audit" className="mt-3 inline-block text-sm font-semibold text-primary">
              Открыть журнал аудита →
            </Link>
          )}
        </Card>
      </div>
    </>
  );
}
