"use client";

import { Guard } from "@/components/session";
import { AuditLogView } from "@/components/audit/audit-log";

export default function AuditPage() {
  return (
    <Guard anyOf={["it.audit.view", "admin.audit.view"]}>
      <AuditLogView app="it" breadcrumbs={[{ label: "ИТ-поддержка", href: "/it" }, { label: "Журнал аудита" }]} />
    </Guard>
  );
}
