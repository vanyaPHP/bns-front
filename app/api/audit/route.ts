import { APP_CODES, type AppCode } from "@/lib/enums";
import { requireAuth } from "@/server/auth";
import { readTable } from "@/server/db";
import { badRequest, forbidden, json, route } from "@/server/http";
import { loadRefs } from "@/server/org";

export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const sp = new URL(req.url).searchParams;
  const app = sp.get("app") as AppCode | null;
  if (app && !APP_CODES.includes(app)) throw badRequest("Неизвестное приложение");
  const global = ctx.permissions.has("admin.audit.view");
  if (!global && !(app && ctx.permissions.has(`${app}.audit.view`))) throw forbidden();

  const entityId = sp.get("entityId");
  const userId = sp.get("userId");
  const from = sp.get("from");
  const to = sp.get("to");
  const q = sp.get("q")?.toLowerCase().trim();
  const limit = Math.min(Number(sp.get("limit")) || 1000, 5000);

  const [logs, users, { refs }] = await Promise.all([readTable("audit_logs"), readTable("users"), loadRefs()]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows = logs
    .filter((l) => (!app || l.app === app) && (!entityId || l.entityId === entityId) && (!userId || l.userId === userId))
    .filter((l) => (!from || l.createdAt.slice(0, 10) >= from) && (!to || l.createdAt.slice(0, 10) <= to))
    .map((l) => {
      const u = l.userId ? userMap.get(l.userId) : undefined;
      return { ...l, user: u ? { login: u.login, name: refs.get(u.employeeId)?.shortName ?? u.login } : null };
    })
    .filter((l) => !q || `${l.summary} ${l.action} ${l.user?.name ?? ""} ${l.user?.login ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  return json(rows);
});
