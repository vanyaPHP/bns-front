import type { DocumentDTO } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { readTable } from "@/server/db";
import { json, route } from "@/server/http";
import { loadRefs } from "@/server/org";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const [docs, users, { refs }] = await Promise.all([readTable("employee_documents"), readTable("users"), loadRefs()]);
  const rows: DocumentDTO[] = docs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
      const u = users.find((x) => x.id === d.uploadedByUserId);
      return { ...d, employee: refs.get(d.employeeId) ?? null, uploadedBy: u ? refs.get(u.employeeId)?.shortName ?? u.login : "—" };
    });
  return json(rows);
});
