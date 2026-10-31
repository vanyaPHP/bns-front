import { fullName } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, json, readJson, route } from "@/server/http";
import { parseEmployee, toEmployeeDTOs } from "@/server/employees";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const rows = await readTable("employees");
  rows.sort((a, b) => fullName(a).localeCompare(fullName(b), "ru"));
  return json(await toEmployeeDTOs(rows, ctx));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.create");
  const input = parseEmployee(await readJson(req));
  const departments = await readTable("departments");
  if (!departments.some((d) => d.id === input.departmentId)) throw badRequest("Подразделение не найдено");
  const now = nowISO();
  const employee = await mutate("employees", (rows) => {
    if (rows.some((r) => r.email.toLowerCase() === input.email.toLowerCase())) throw badRequest("Сотрудник с таким email уже существует");
    if (rows.some((r) => r.passport.personalNumber === input.passport.personalNumber)) {
      throw badRequest("Сотрудник с таким идентификационным номером уже зарегистрирован");
    }
    const e: Employee = {
      id: newId(),
      personnelNumber: String(rows.reduce((m, r) => Math.max(m, Number(r.personnelNumber) || 0), 1000) + 1),
      ...input,
      // The HR manager who registers the employee becomes their responsible HR manager.
      hrManagerId: ctx.employee.id,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(e);
    return e;
  });
  await audit({
    app: "hr",
    action: "employee.create",
    entityType: "employee",
    entityId: employee.id,
    userId: ctx.user.id,
    summary: `Принят сотрудник ${fullName(employee)} (таб. № ${employee.personnelNumber}), ${employee.position}`,
  });
  const [dto] = await toEmployeeDTOs([employee], ctx);
  return json(dto, { status: 201 });
});
