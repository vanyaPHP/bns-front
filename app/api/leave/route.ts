import { LEAVE_TYPE, enumLabel, isEnumValue } from "@/lib/enums";
import { daysBetweenInclusive, formatDate, fullName, todayISO } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, mutate, newId, nextNumber, nowISO, readTable } from "@/server/db";
import { badRequest, forbidden, isoDate, json, notFound, readJson, route, str } from "@/server/http";
import { annualBalance, canSeeEmployeeLeaves, overallStatus, resolveApprovers, toLeaveDTOs } from "@/server/leave";

export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "my";
  const leaves = await readTable("leave_requests");
  let rows: LeaveRequest[];
  if (scope === "all") {
    requirePermission(ctx, "vacation.view_all");
    rows = leaves;
  } else if (scope === "approvals") {
    rows = leaves.filter((l) => l.headApproval.approverEmployeeId === ctx.employee.id || l.hrApproval.approverEmployeeId === ctx.employee.id);
  } else if (scope === "employee") {
    const employeeId = sp.get("employeeId") ?? "";
    if (!(await canSeeEmployeeLeaves(ctx, employeeId))) throw forbidden();
    rows = leaves.filter((l) => l.employeeId === employeeId);
  } else {
    rows = leaves.filter((l) => l.employeeId === ctx.employee.id);
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(await toLeaveDTOs(rows, ctx));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "vacation.request");
  const body = await readJson(req);
  if (!isEnumValue(LEAVE_TYPE, body.type)) throw badRequest("Выберите тип отсутствия");
  const startDate = isoDate(body.startDate, "Дата начала");
  const endDate = isoDate(body.endDate, "Дата окончания");
  if (endDate < startDate) throw badRequest("Дата окончания не может быть раньше даты начала");
  const today = todayISO();
  // Sick leave may be registered retroactively (within 30 days); other types only for future dates.
  const minStart = body.type === "sick" ? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) : today;
  if (startDate < minStart) throw badRequest(body.type === "sick" ? "Больничный можно оформить не позднее 30 дней с начала" : "Дата начала не может быть в прошлом");
  const days = daysBetweenInclusive(startDate, endDate);
  if (days > 120) throw badRequest("Слишком длительный период");
  const reason = str(body.reason, "Комментарий", { max: 1000, required: body.type === "unpaid" });

  const employee = await findById("employees", ctx.employee.id);
  if (!employee) throw notFound();
  const leaves = await readTable("leave_requests");
  const overlap = leaves.find(
    (l) => l.employeeId === employee.id && (l.status === "pending" || l.status === "approved") && l.startDate <= endDate && l.endDate >= startDate,
  );
  if (overlap) throw badRequest(`Период пересекается с заявлением №${overlap.number} (${formatDate(overlap.startDate)} — ${formatDate(overlap.endDate)})`);
  if (body.type === "annual") {
    const balance = await annualBalance(employee.id, Number(startDate.slice(0, 4)));
    if (days > balance.remaining) throw badRequest(`Недостаточно дней отпуска: доступно ${balance.remaining} из ${balance.entitlement}`);
  }

  const { head, hr } = await resolveApprovers(employee);
  const now = nowISO();
  const leave = await mutate("leave_requests", (rows) => {
    const l: LeaveRequest = {
      id: newId(),
      number: nextNumber(rows),
      employeeId: employee.id,
      type: body.type as LeaveRequest["type"],
      startDate,
      endDate,
      days,
      reason,
      status: "pending",
      headApproval: head,
      hrApproval: hr,
      createdByUserId: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    };
    l.status = overallStatus(l);
    rows.push(l);
    return l;
  });
  await audit({
    app: "vacation",
    action: "leave.create",
    entityType: "leave",
    entityId: leave.id,
    userId: ctx.user.id,
    summary: `Заявление №${leave.number}: ${enumLabel(LEAVE_TYPE, leave.type)} ${formatDate(startDate)} — ${formatDate(endDate)} (${days} дн.), ${fullName(employee)}`,
  });
  const [dto] = await toLeaveDTOs([leave], ctx);
  return json(dto, { status: 201 });
});
