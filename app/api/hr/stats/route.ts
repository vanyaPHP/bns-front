import { fullName, todayISO } from "@/lib/format";
import { requireAuth, requirePermission } from "@/server/auth";
import { readTable } from "@/server/db";
import { json, route } from "@/server/http";
import { descendantIds } from "@/server/org";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const [employees, departments, leaves, documents] = await Promise.all([
    readTable("employees"),
    readTable("departments"),
    readTable("leave_requests"),
    readTable("employee_documents"),
  ]);
  const active = employees.filter((e) => e.status !== "dismissed");
  const today = todayISO();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const onLeave = leaves.filter((l) => l.status === "approved" && l.startDate <= today && l.endDate >= today);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthdays = active
    .map((e) => {
      const [, m, d] = e.birthDate.split("-").map(Number);
      let next = new Date(now.getFullYear(), m - 1, d);
      if (next < startOfToday) next = new Date(now.getFullYear() + 1, m - 1, d);
      return {
        id: e.id,
        name: fullName(e),
        position: e.position,
        date: `${next.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        inDays: Math.round((next.getTime() - startOfToday.getTime()) / 86_400_000),
      };
    })
    .filter((b) => b.inDays <= 30)
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 6);

  // Headcount per first-level unit (including nested sub-units).
  const root = departments.find((d) => d.parentId === null);
  const units = departments.filter((d) => d.parentId === root?.id);
  const headcount = [
    ...(root ? [{ id: root.id, label: root.name, value: active.filter((e) => e.departmentId === root.id).length }] : []),
    ...units.map((d) => {
      const ids = new Set(descendantIds(departments, d.id));
      return { id: d.id, label: d.name, value: active.filter((e) => ids.has(e.departmentId)).length };
    }),
  ].sort((a, b) => b.value - a.value);

  return json({
    total: active.length,
    probation: active.filter((e) => e.status === "probation").length,
    dismissed: employees.length - active.length,
    newHires: active.filter((e) => e.hireDate >= monthAgo).length,
    onLeaveToday: onLeave.length,
    departments: departments.length,
    documents: documents.length,
    myEmployees: active.filter((e) => e.hrManagerId === ctx.employee.id).length,
    headcount,
    birthdays,
    recentHires: [...active]
      .sort((a, b) => b.hireDate.localeCompare(a.hireDate))
      .slice(0, 6)
      .map((e) => ({
        id: e.id,
        name: fullName(e),
        position: e.position,
        hireDate: e.hireDate,
        department: departments.find((d) => d.id === e.departmentId)?.name ?? "",
      })),
  });
});
