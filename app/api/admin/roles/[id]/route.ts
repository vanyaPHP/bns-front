import { permissionLabel } from "@/lib/permissions";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, mutate, nowISO, readTable } from "@/server/db";
import { badRequest, json, notFound, readJson, route } from "@/server/http";
import { parseRole } from "@/server/roles";

export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.roles.view");
  const role = await findById("roles", id);
  if (!role) throw notFound("Роль не найдена");
  const users = await readTable("users");
  return json({ ...role, userCount: users.filter((u) => u.roleIds.includes(id)).length });
});

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.roles.manage");
  const current = await findById("roles", id);
  if (!current) throw notFound("Роль не найдена");
  const input = parseRole(await readJson(req));
  if (current.isSystem && input.code !== current.code) throw badRequest("Код системной роли изменить нельзя");
  if (ctx.user.roleIds.includes(id) && !input.permissions.includes("admin.roles.manage")) {
    const otherGrants = (await readTable("roles")).some((r) => r.id !== id && ctx.user.roleIds.includes(r.id) && r.permissions.includes("admin.roles.manage"));
    if (!otherGrants) throw badRequest("Нельзя лишить себя права управления ролями");
  }
  const updated = await mutate("roles", (rows) => {
    if (rows.some((r) => r.id !== id && r.code === input.code)) throw badRequest("Роль с таким кодом уже существует");
    const r = rows.find((x) => x.id === id)!;
    Object.assign(r, input, { updatedAt: nowISO() });
    return { ...r };
  });
  const added = updated.permissions.filter((p) => !current.permissions.includes(p));
  const removed = current.permissions.filter((p) => !updated.permissions.includes(p));
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (current.name !== updated.name) changes.name = { from: current.name, to: updated.name };
  if (current.code !== updated.code) changes.code = { from: current.code, to: updated.code };
  if (current.description !== updated.description) changes.description = { from: current.description, to: updated.description };
  if (added.length || removed.length) changes.permissions = { from: removed.map(permissionLabel), to: added.map(permissionLabel) };
  await audit({
    app: "admin",
    action: "role.update",
    entityType: "role",
    entityId: id,
    userId: ctx.user.id,
    summary: `Изменена роль «${updated.name}»: +${added.length} / −${removed.length} прав`,
    changes: Object.keys(changes).length ? changes : null,
  });
  return json(updated);
});

export const DELETE = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.roles.manage");
  const role = await findById("roles", id);
  if (!role) throw notFound("Роль не найдена");
  if (role.isSystem) throw badRequest("Системную роль удалить нельзя");
  const users = await readTable("users");
  if (users.some((u) => u.roleIds.includes(id))) throw badRequest("Роль назначена пользователям — сначала снимите её");
  await mutate("roles", (rows) => {
    rows.splice(
      rows.findIndex((r) => r.id === id),
      1,
    );
  });
  await audit({ app: "admin", action: "role.delete", entityType: "role", entityId: id, userId: ctx.user.id, summary: `Удалена роль «${role.name}» (${role.code})` });
  return json({ ok: true });
});
