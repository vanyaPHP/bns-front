import "server-only";
import type { User, UserDTO } from "@/lib/types";
import { readTable } from "./db";
import { loadRefs } from "./org";

export async function toUserDTOs(users: User[]): Promise<UserDTO[]> {
  const [roles, { refs }] = await Promise.all([readTable("roles"), loadRefs()]);
  return users.map((user) => {
    const u: Omit<User, "passwordHash"> & { passwordHash?: string } = { ...user };
    delete u.passwordHash;
    return {
      ...u,
      employee: refs.get(u.employeeId) ?? null,
      roles: roles.filter((r) => u.roleIds.includes(r.id)).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    };
  });
}

export function validatePassword(p: string) {
  if (p.length < 6) return "Пароль должен содержать не менее 6 символов";
  return null;
}
