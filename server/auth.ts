import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ClientSession, Department, Employee, Role, User } from "@/lib/types";
import { fullName, shortName } from "@/lib/format";
import { readTable, mutate, newId, nowISO } from "./db";
import { HttpError, forbidden } from "./http";

export const SESSION_COOKIE = "bns_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export interface AuthContext {
  user: User;
  employee: Employee;
  department: Department | undefined;
  roles: Role[];
  permissions: Set<string>;
  headOfDepartmentIds: string[];
  isApprover: boolean;
}

export async function createSession(userId: string) {
  const id = newId() + newId().replace(/-/g, "");
  const now = Date.now();
  await mutate("sessions", (rows) => {
    // Drop expired sessions while we are here.
    for (let i = rows.length - 1; i >= 0; i--) {
      if (new Date(rows[i].expiresAt).getTime() < now) rows.splice(i, 1);
    }
    rows.push({ id, userId, createdAt: nowISO(), expiresAt: new Date(now + SESSION_TTL_MS).toISOString() });
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    await mutate("sessions", (rows) => {
      const idx = rows.findIndex((s) => s.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    });
  }
  jar.delete(SESSION_COOKIE);
}

export async function buildAuthContext(user: User): Promise<AuthContext | null> {
  const [employees, roles, departments] = await Promise.all([
    readTable("employees"),
    readTable("roles"),
    readTable("departments"),
  ]);
  const employee = employees.find((e) => e.id === user.employeeId);
  if (!employee) return null;
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const permissions = new Set(userRoles.flatMap((r) => r.permissions));
  const headOfDepartmentIds = departments.filter((d) => d.headEmployeeId === employee.id).map((d) => d.id);
  const isApprover = headOfDepartmentIds.length > 0 || employees.some((e) => e.hrManagerId === employee.id);
  return {
    user,
    employee,
    department: departments.find((d) => d.id === employee.departmentId),
    roles: userRoles,
    permissions,
    headOfDepartmentIds,
    isApprover,
  };
}

export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const sessions = await readTable("sessions");
  const session = sessions.find((s) => s.id === sid);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const users = await readTable("users");
  const user = users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) return null;
  return buildAuthContext(user);
});

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) throw new HttpError(401, "Требуется авторизация");
  return ctx;
}

export function can(ctx: AuthContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

export function requirePermission(ctx: AuthContext, ...anyOf: string[]) {
  if (!anyOf.some((p) => ctx.permissions.has(p))) throw forbidden();
}

export function toClientSession(ctx: AuthContext): ClientSession {
  return {
    userId: ctx.user.id,
    login: ctx.user.login,
    employee: {
      id: ctx.employee.id,
      fullName: fullName(ctx.employee),
      shortName: shortName(ctx.employee),
      firstName: ctx.employee.firstName,
      position: ctx.employee.position,
      departmentId: ctx.employee.departmentId,
      departmentName: ctx.department?.name ?? "",
      email: ctx.employee.email,
    },
    roles: ctx.roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    permissions: [...ctx.permissions],
    headOfDepartmentIds: ctx.headOfDepartmentIds,
    isApprover: ctx.isApprover,
  };
}
