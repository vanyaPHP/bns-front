import type { Department } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { mutate, newId, nowISO, readTable } from "@/server/db";
import { json, readJson, route } from "@/server/http";
import { parseDepartment, toDepartmentDTOs } from "@/server/departments";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.departments.view", "hr.employees.view");
  const rows = await readTable("departments");
  return json(await toDepartmentDTOs(rows));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.departments.manage");
  const input = await parseDepartment(await readJson(req));
  const now = nowISO();
  const dept = await mutate("departments", (rows) => {
    const d: Department = { id: newId(), ...input, createdAt: now, updatedAt: now };
    rows.push(d);
    return d;
  });
  await audit({
    app: "hr",
    action: "department.create",
    entityType: "department",
    entityId: dept.id,
    userId: ctx.user.id,
    summary: `Создано подразделение «${dept.name}» (${dept.code})`,
  });
  return json(dept, { status: 201 });
});
