import { readTable, mutate, nowISO } from "@/server/db";
import { createSession } from "@/server/auth";
import { verifyPassword } from "@/server/password";
import { audit } from "@/server/audit";
import { HttpError, json, readJson, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const login = str(body.login, "Логин", { required: true }).toLowerCase();
  const password = str(body.password, "Пароль", { required: true });
  const users = await readTable("users");
  const user = users.find((u) => u.login.toLowerCase() === login);
  if (!user || !verifyPassword(password, user.passwordHash)) throw new HttpError(401, "Неверный логин или пароль");
  if (!user.isActive) throw new HttpError(403, "Учётная запись заблокирована. Обратитесь к администратору");
  await mutate("users", (rows) => {
    const u = rows.find((r) => r.id === user.id);
    if (u) u.lastLoginAt = nowISO();
  });
  await createSession(user.id);
  await audit({ app: "admin", action: "auth.login", entityType: "user", entityId: user.id, userId: user.id, summary: `Вход в систему: ${user.login}` });
  return json({ ok: true });
});
