import { requireAuth } from "@/server/auth";
import { readTable } from "@/server/db";
import { json, route } from "@/server/http";

export const GET = route(async () => {
  await requireAuth();
  const departments = await readTable("departments");
  return json(departments.map(({ id, name, shortName, parentId, code }) => ({ id, name, shortName, parentId, code })));
});
