import { requireAuth } from "@/server/auth";
import { readTable } from "@/server/db";
import { forbidden, json, route } from "@/server/http";
import { enrichHardware } from "@/server/hardware";
import { managedDepartmentIds } from "@/server/org";

/** Hardware assigned to the current user, or to an employee the user manages or administers. */
export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const employeeId = new URL(req.url).searchParams.get("employeeId") ?? ctx.employee.id;
  if (employeeId !== ctx.employee.id) {
    const [employees, departments] = await Promise.all([readTable("employees"), readTable("departments")]);
    const emp = employees.find((e) => e.id === employeeId);
    const managed = managedDepartmentIds(departments, ctx.employee.id);
    const allowed =
      ctx.permissions.has("it.hardware.view") ||
      ctx.permissions.has("hr.employees.view") ||
      (emp && managed.has(emp.departmentId));
    if (!allowed) throw forbidden();
  }
  const rows = (await readTable("hardware")).filter((h) => h.employeeId === employeeId);
  return json(await enrichHardware(rows));
});
