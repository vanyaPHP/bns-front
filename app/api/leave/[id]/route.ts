import { APPROVAL_STATUS, LEAVE_STATUS, enumLabel } from "@/lib/enums";
import { todayISO } from "@/lib/format";
import { requireAuth } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, mutate, nowISO } from "@/server/db";
import { badRequest, forbidden, json, notFound, readJson, route, str } from "@/server/http";
import { loadRefs } from "@/server/org";
import { approverRoles, canCancel, canSeeEmployeeLeaves, overallStatus, toLeaveDTOs } from "@/server/leave";

export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  const leave = await findById("leave_requests", id);
  if (!leave) throw notFound("Заявление не найдено");
  const isApprover = leave.headApproval.approverEmployeeId === ctx.employee.id || leave.hrApproval.approverEmployeeId === ctx.employee.id;
  if (!isApprover && !(await canSeeEmployeeLeaves(ctx, leave.employeeId))) throw forbidden();
  const [dto] = await toLeaveDTOs([leave], ctx);
  return json(dto);
});

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  const body = await readJson(req);
  const action = body.action as "approve" | "reject" | "cancel";
  const comment = str(body.comment, "Комментарий", { max: 1000 });
  const current = await findById("leave_requests", id);
  if (!current) throw notFound("Заявление не найдено");

  let summary = "";
  const { refs } = await loadRefs();
  const updated = await mutate("leave_requests", (rows) => {
    const l = rows.find((r) => r.id === id)!;
    const now = nowISO();
    if (action === "cancel") {
      if (!canCancel(ctx, l, todayISO())) throw forbidden("Отменить можно только своё заявление до начала отпуска");
      l.status = "cancelled";
      summary = `Заявление №${l.number} отменено сотрудником`;
    } else if (action === "approve" || action === "reject") {
      const roles = approverRoles(ctx, l);
      if (!roles.length) throw forbidden("Вы не являетесь согласующим по этому заявлению или уже приняли решение");
      if (action === "reject" && !comment) throw badRequest("Укажите причину отклонения");
      const status = action === "approve" ? "approved" : "rejected";
      for (const r of roles) {
        const s = r === "head" ? l.headApproval : l.hrApproval;
        s.status = status;
        s.decidedAt = now;
        s.comment = comment;
      }
      l.status = overallStatus(l);
      const as = roles.map((r) => (r === "head" ? "руководитель" : "HR-менеджер")).join(" и ");
      summary = `Заявление №${l.number} (${refs.get(l.employeeId)?.shortName}): ${as} — ${enumLabel(APPROVAL_STATUS, status).toLowerCase()}. Итог: ${enumLabel(LEAVE_STATUS, l.status)}`;
    } else {
      throw badRequest("Неизвестное действие");
    }
    l.updatedAt = now;
    return structuredClone(l);
  });

  await audit({
    app: "vacation",
    action: `leave.${action}`,
    entityType: "leave",
    entityId: id,
    userId: ctx.user.id,
    summary: summary + (comment ? ` — «${comment}»` : ""),
    changes: { status: { from: enumLabel(LEAVE_STATUS, current.status), to: enumLabel(LEAVE_STATUS, updated.status) } },
  });
  const [dto] = await toLeaveDTOs([updated], ctx);
  return json(dto);
});
