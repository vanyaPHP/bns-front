import { destroySession } from "@/server/auth";
import { json, route } from "@/server/http";

export const POST = route(async () => {
  await destroySession();
  return json({ ok: true });
});
