import { requireAuth } from "@/server/auth";
import { json, route } from "@/server/http";
import { loadRefs, managedDepartmentIds } from "@/server/org";

/** Minimal employee directory available to every authenticated user. */
export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const departmentId = url.searchParams.get("departmentId");
  const { employees, departments, refs } = await loadRefs();
  let list = employees.filter((e) => e.status !== "dismissed");
  if (scope === "managed") {
    const managed = managedDepartmentIds(departments, ctx.employee.id);
    list = list.filter((e) => e.id === ctx.employee.id || managed.has(e.departmentId));
  }
  if (departmentId) list = list.filter((e) => e.departmentId === departmentId);
  return json(list.map((e) => refs.get(e.id)!).sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")));
});
