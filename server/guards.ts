import "server-only";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

/** Server-side guard for sub-application layouts. */
export async function requireAppAccess(permission: string) {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  if (!ctx.permissions.has(permission)) redirect("/?denied=1");
  return ctx;
}
