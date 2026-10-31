import { EMPLOYEE_STATUS, enumLabel } from "@/lib/enums";
import { fullName } from "@/lib/format";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit, diff, mask } from "@/server/audit";
import { findById, mutate, nowISO, readTable } from "@/server/db";
import { badRequest, json, notFound, readJson, route, str } from "@/server/http";
import { parseEmployee, toEmployeeDTOs } from "@/server/employees";

export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const e = await findById("employees", id);
  if (!e) throw notFound("Сотрудник не найден");
  const [dto] = await toEmployeeDTOs([e], ctx);
  return json(dto);
});

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.edit");
  const body = await readJson(req);
  const current = await findById("employees", id);
  if (!current) throw notFound("Сотрудник не найден");
  if (!ctx.permissions.has("hr.employees.sensitive")) {
    // Without access to sensitive data the redacted values must not overwrite real ones.
    body.passport = current.passport;
    body.bank = current.bank;
  }
  const input = parseEmployee(body);
  const departments = await readTable("departments");
  if (!departments.some((d) => d.id === input.departmentId)) throw badRequest("Подразделение не найдено");
  const headOf = departments.filter((d) => d.headEmployeeId === id);
  if (headOf.length && (input.departmentId !== current.departmentId || input.status === "dismissed")) {
    const wrong = headOf.filter((d) => d.id !== input.departmentId || input.status === "dismissed");
    if (wrong.length) {
      throw badRequest(`Сотрудник является руководителем подразделения «${wrong[0].name}». Сначала назначьте другого руководителя`);
    }
  }
  const hrManagerId = str(body.hrManagerId, "HR-менеджер") || current.hrManagerId;

  const updated = await mutate("employees", (rows) => {
    if (rows.some((r) => r.id !== id && r.email.toLowerCase() === input.email.toLowerCase())) throw badRequest("Сотрудник с таким email уже существует");
    const e = rows.find((r) => r.id === id)!;
    Object.assign(e, input, { hrManagerId, updatedAt: nowISO() });
    return { ...e };
  });
  const statusChanged = current.status !== updated.status;
  await audit({
    app: "hr",
    action: "employee.update",
    entityType: "employee",
    entityId: id,
    userId: ctx.user.id,
    summary: `Изменена карточка сотрудника ${fullName(updated)}${statusChanged ? ` (статус: ${enumLabel(EMPLOYEE_STATUS, updated.status)})` : ""}`,
    changes: mask(diff(current, updated), ["passport", "bank"]),
  });
  const [dto] = await toEmployeeDTOs([updated], ctx);
  return json(dto);
});
