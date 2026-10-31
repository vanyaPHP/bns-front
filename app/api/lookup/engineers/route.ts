import { requireAuth } from "@/server/auth";
import { json, route } from "@/server/http";
import { loadRefs } from "@/server/org";
import { engineerIds } from "@/server/tickets";

export const GET = route(async () => {
  await requireAuth();
  const [ids, { refs }] = await Promise.all([engineerIds(), loadRefs()]);
  return json([...ids].map((id) => refs.get(id)).filter(Boolean));
});
