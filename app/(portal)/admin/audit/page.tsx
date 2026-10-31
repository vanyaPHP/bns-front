"use client";

import { Guard } from "@/components/session";
import { AuditLogView } from "@/components/audit/audit-log";

export default function AuditPage() {
  return (
    <Guard anyOf={["admin.audit.view"]}>
      <AuditLogView breadcrumbs={[{ label: "Администрирование", href: "/admin" }, { label: "Журнал аудита" }]} />
    </Guard>
  );
}
