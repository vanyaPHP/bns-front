import { requireAuth } from "@/server/auth";
import { forbidden, json, route } from "@/server/http";
import { annualBalance, canSeeEmployeeLeaves } from "@/server/leave";

export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const sp = new URL(req.url).searchParams;
  const employeeId = sp.get("employeeId") ?? ctx.employee.id;
  if (!(await canSeeEmployeeLeaves(ctx, employeeId))) throw forbidden();
  const year = Number(sp.get("year")) || new Date().getFullYear();
  return json(await annualBalance(employeeId, year));
});
