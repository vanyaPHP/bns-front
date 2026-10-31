import type { User } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, json, readJson, route, str } from "@/server/http";
import { hashPassword } from "@/server/password";
import { loadRefs } from "@/server/org";
import { toUserDTOs, validatePassword } from "@/server/users";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.users.view");
  const users = await readTable("users");
  users.sort((a, b) => a.login.localeCompare(b.login));
  return json(await toUserDTOs(users));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "admin.users.manage");
  const body = await readJson(req);
  const login = str(body.login, "Логин", { required: true, max: 50 }).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(login)) throw badRequest("Логин: латинские буквы, цифры, точка, дефис; не менее 3 символов");
  const password = str(body.password, "Пароль", { required: true, max: 100 });
  const pwError = validatePassword(password);
  if (pwError) throw badRequest(pwError);
  const employeeId = str(body.employeeId, "Сотрудник", { required: true });
  const roleIds = Array.isArray(body.roleIds) ? (body.roleIds as string[]) : [];
  const [roles, employees] = await Promise.all([readTable("roles"), readTable("employees")]);
  if (!employees.some((e) => e.id === employeeId && e.status !== "dismissed")) throw badRequest("Сотрудник не найден или уволен");
  if (roleIds.some((r) => !roles.some((x) => x.id === r))) throw badRequest("Указана несуществующая роль");
  if (!roleIds.length) throw badRequest("Назначьте хотя бы одну роль");

  const now = nowISO();
  const user = await mutate("users", (rows) => {
    if (rows.some((u) => u.login === login)) throw badRequest("Логин уже занят");
    if (rows.some((u) => u.employeeId === employeeId)) throw badRequest("У сотрудника уже есть учётная запись");
    const u: User = { id: newId(), login, passwordHash: hashPassword(password), employeeId, roleIds, isActive: true, lastLoginAt: null, createdAt: now, updatedAt: now };
    rows.push(u);
    return u;
  });
  const { refs } = await loadRefs();
  await audit({
    app: "admin",
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    userId: ctx.user.id,
    summary: `Создана учётная запись ${login} для ${refs.get(employeeId)?.fullName}; роли: ${roles.filter((r) => roleIds.includes(r.id)).map((r) => r.name).join(", ")}`,
  });
  const [dto] = await toUserDTOs([user]);
  return json(dto, { status: 201 });
});
