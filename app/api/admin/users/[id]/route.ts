import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, mutate, nowISO, readTable } from "@/server/db";
import { badRequest, json, notFound, readJson, route, str } from "@/server/http";
import { hashPassword } from "@/server/password";
import { toUserDTOs, validatePassword } from "@/server/users";

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.users.manage");
  const body = await readJson(req);
  const current = await findById("users", id);
  if (!current) throw notFound("Пользователь не найден");
  const roles = await readTable("roles");
  const roleName = (rid: string) => roles.find((r) => r.id === rid)?.name ?? rid;
  let summary = "";
  let changes: Record<string, { from: unknown; to: unknown }> | null = null;

  const updated = await mutate("users", (rows) => {
    const u = rows.find((r) => r.id === id)!;
    if (body.action === "reset_password") {
      const password = str(body.password, "Пароль", { required: true, max: 100 });
      const err = validatePassword(password);
      if (err) throw badRequest(err);
      u.passwordHash = hashPassword(password);
      summary = `Сброшен пароль пользователя ${u.login}`;
    } else if (body.action === "update") {
      const roleIds = Array.isArray(body.roleIds) ? (body.roleIds as string[]) : u.roleIds;
      if (roleIds.some((r) => !roles.some((x) => x.id === r))) throw badRequest("Указана несуществующая роль");
      if (!roleIds.length) throw badRequest("Назначьте хотя бы одну роль");
      const isActive = typeof body.isActive === "boolean" ? body.isActive : u.isActive;
      if (u.id === ctx.user.id) {
        // Prevent administrators from locking themselves out.
        if (!isActive) throw badRequest("Нельзя заблокировать собственную учётную запись");
        const keepsAdmin = roles.some((r) => roleIds.includes(r.id) && r.permissions.includes("admin.users.manage"));
        if (!keepsAdmin) throw badRequest("Нельзя лишить себя права управления пользователями");
      }
      changes = {};
      if (JSON.stringify([...u.roleIds].sort()) !== JSON.stringify([...roleIds].sort())) {
        changes.roleIds = { from: u.roleIds.map(roleName), to: roleIds.map(roleName) };
      }
      if (u.isActive !== isActive) changes.isActive = { from: u.isActive, to: isActive };
      u.roleIds = roleIds;
      u.isActive = isActive;
      summary = `Изменена учётная запись ${u.login}${changes.isActive ? (isActive ? " (разблокирована)" : " (заблокирована)") : ""}`;
    } else {
      throw badRequest("Неизвестное действие");
    }
    u.updatedAt = nowISO();
    return { ...u };
  });

  if (!updated.isActive) {
    await mutate("sessions", (rows) => {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].userId === id) rows.splice(i, 1);
    });
  }
  await audit({ app: "admin", action: `user.${body.action}`, entityType: "user", entityId: id, userId: ctx.user.id, summary, changes });
  const [dto] = await toUserDTOs([updated]);
  return json(dto);
});
