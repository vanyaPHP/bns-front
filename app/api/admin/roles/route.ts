import type { Role } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, json, readJson, route } from "@/server/http";
import { parseRole } from "@/server/roles";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.roles.view", "admin.users.view");
  const [roles, users] = await Promise.all([readTable("roles"), readTable("users")]);
  return json(roles.map((r) => ({ ...r, userCount: users.filter((u) => u.roleIds.includes(r.id)).length })));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.roles.manage");
  const input = parseRole(await readJson(req));
  const now = nowISO();
  const role = await mutate("roles", (rows) => {
    if (rows.some((r) => r.code === input.code)) throw badRequest("Роль с таким кодом уже существует");
    const r: Role = { id: newId(), ...input, isSystem: false, createdAt: now, updatedAt: now };
    rows.push(r);
    return r;
  });
  await audit({
    app: "admin",
    action: "role.create",
    entityType: "role",
    entityId: role.id,
    userId: ctx.user.id,
    summary: `Создана роль «${role.name}» (${role.code}), прав: ${role.permissions.length}`,
  });
  return json(role, { status: 201 });
});
