import { requireAuth, toClientSession } from "@/server/auth";
import { json, route } from "@/server/http";

export const GET = route(async () => json(toClientSession(await requireAuth())));
