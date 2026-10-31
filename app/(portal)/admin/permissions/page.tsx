"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Check } from "lucide-react";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { useApi } from "@/lib/api-client";
import type { RoleDTO } from "@/lib/types";
import { Guard } from "@/components/session";
import { Card, PageHeader, Spinner } from "@/components/ui";

export default function PermissionsPage() {
  return (
    <Guard anyOf={["admin.roles.view"]}>
      <Matrix />
    </Guard>
  );
}

function Matrix() {
  const { data: roles } = useApi<RoleDTO[]>("/api/admin/roles");
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Администрирование", href: "/admin" }, { label: "Права доступа" }]}
        title="Матрица прав доступа"
        description="Каталог прав системы и их распределение по ролям. Изменить набор прав можно в карточке роли."
      />
      {!roles ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <th className="sticky left-0 z-10 min-w-[320px] bg-muted px-6 py-3.5 text-left">Право</th>
                {roles.map((r) => (
                  <th key={r.id} className="min-w-[110px] px-3 py-3.5 text-center normal-case tracking-normal">
                    <Link href={`/admin/roles/${r.id}`} className="hover:text-primary">
                      <div className="font-semibold text-fg">{r.name}</div>
                      <div className="font-mono text-[10px] font-normal text-fg-subtle">{r.code}</div>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((g) => (
                <Fragment key={g.app}>
                  <tr className="border-t border-line bg-muted/40">
                    <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-fg-muted">
                      {g.label}
                    </td>
                  </tr>
                  {g.permissions.map((p) => (
                    <tr key={p.key} className="border-t border-line hover:bg-hover">
                      <td className="sticky left-0 z-10 bg-card px-6 py-3">
                        <div className="font-semibold text-fg">{p.label}</div>
                        <div className="font-mono text-[11px] text-fg-subtle">{p.key}</div>
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="px-3 py-3 text-center">
                          {r.permissions.includes(p.key) && <Check className="mx-auto h-4 w-4 text-emerald-500" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
