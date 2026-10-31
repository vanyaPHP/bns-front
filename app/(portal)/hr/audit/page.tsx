"use client";

import { Guard } from "@/components/session";
import { AuditLogView } from "@/components/audit/audit-log";

export default function AuditPage() {
  return (
    <Guard anyOf={["hr.audit.view", "admin.audit.view"]}>
      <AuditLogView app="hr" breadcrumbs={[{ label: "Персонал", href: "/hr" }, { label: "Журнал аудита" }]} />
    </Guard>
  );
}
