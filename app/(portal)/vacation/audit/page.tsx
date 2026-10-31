"use client";

import { Guard } from "@/components/session";
import { AuditLogView } from "@/components/audit/audit-log";

export default function AuditPage() {
  return (
    <Guard anyOf={["vacation.audit.view", "admin.audit.view"]}>
      <AuditLogView app="vacation" breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Журнал аудита" }]} />
    </Guard>
  );
}
