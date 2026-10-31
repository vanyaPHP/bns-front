import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ClientSession } from "./types";

const SESSION_COOKIE = "bns_session";
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/+$/, "");

/** Resolves the current session via bns-back; null when signed out or expired. */
export const getSession = cache(async (): Promise<ClientSession | null> => {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(sid)}` },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`bns-back /api/auth/me responded with ${res.status}`);
  return (await res.json()) as ClientSession;
});

/** Server-side guard for sub-application layouts. */
export async function requireAppAccess(permission: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.permissions.includes(permission)) redirect("/?denied=1");
  return session;
}
