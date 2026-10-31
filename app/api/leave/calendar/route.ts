import { requireAuth } from "@/server/auth";
import { readTable } from "@/server/db";
import { forbidden, json, route } from "@/server/http";
import { descendantIds, loadRefs, managedDepartmentIds } from "@/server/org";

/** Approved and pending absences for a month, scoped to the departments the user may see. */
export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const sp = new URL(req.url).searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.get("month") ?? "") ? sp.get("month")! : new Date().toISOString().slice(0, 7);
  const { employees, departments, refs } = await loadRefs();

  const managed = managedDepartmentIds(departments, ctx.employee.id);
  const allowed = new Set<string>([ctx.employee.departmentId, ...managed]);
  const requested = sp.get("departmentId");
  let deptIds: Set<string>;
  if (requested) {
    if (!ctx.permissions.has("vacation.view_all") && !allowed.has(requested)) throw forbidden();
    deptIds = new Set(descendantIds(departments, requested));
  } else {
    deptIds = allowed;
  }

  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  const people = employees.filter((e) => deptIds.has(e.departmentId) && e.status !== "dismissed");
  const ids = new Set(people.map((p) => p.id));
  const leaves = (await readTable("leave_requests")).filter(
    (l) => ids.has(l.employeeId) && (l.status === "approved" || l.status === "pending") && l.startDate <= last && l.endDate >= first,
  );
  return json({
    month,
    departments: departments
      .filter((d) => ctx.permissions.has("vacation.view_all") || allowed.has(d.id))
      .map((d) => ({ id: d.id, name: d.name })),
    employees: people.map((p) => refs.get(p.id)!).sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")),
    leaves: leaves.map((l) => ({ id: l.id, employeeId: l.employeeId, type: l.type, status: l.status, startDate: l.startDate, endDate: l.endDate })),
  });
});
