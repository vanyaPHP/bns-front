import { requireAuth, requirePermission } from "@/server/auth";
import { audit, diff } from "@/server/audit";
import { findById, mutate, nowISO, readTable } from "@/server/db";
import { badRequest, json, notFound, readJson, route } from "@/server/http";
import { parseDepartment } from "@/server/departments";
import { loadRefs } from "@/server/org";

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.departments.manage");
  const current = await findById("departments", id);
  if (!current) throw notFound("Подразделение не найдено");
  const input = await parseDepartment(await readJson(req), id);
  const updated = await mutate("departments", (rows) => {
    const d = rows.find((r) => r.id === id)!;
    Object.assign(d, input, { updatedAt: nowISO() });
    return { ...d };
  });
  const { refs } = await loadRefs();
  const changes = diff(current, updated);
  if (changes?.headEmployeeId) {
    changes.headEmployeeId = { from: refs.get(current.headEmployeeId)?.shortName, to: refs.get(updated.headEmployeeId)?.shortName };
  }
  await audit({
    app: "hr",
    action: "department.update",
    entityType: "department",
    entityId: id,
    userId: ctx.user.id,
    summary: `Изменено подразделение «${updated.name}»`,
    changes,
  });
  return json(updated);
});

export const DELETE = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.departments.manage");
  const [departments, employees] = await Promise.all([readTable("departments"), readTable("employees")]);
  const dept = departments.find((d) => d.id === id);
  if (!dept) throw notFound("Подразделение не найдено");
  if (departments.some((d) => d.parentId === id)) throw badRequest("Нельзя удалить подразделение с дочерними подразделениями");
  if (employees.some((e) => e.departmentId === id)) throw badRequest("Нельзя удалить подразделение, в котором числятся сотрудники");
  await mutate("departments", (rows) => {
    rows.splice(
      rows.findIndex((r) => r.id === id),
      1,
    );
  });
  await audit({ app: "hr", action: "department.delete", entityType: "department", entityId: id, userId: ctx.user.id, summary: `Удалено подразделение «${dept.name}»` });
  return json({ ok: true });
});
