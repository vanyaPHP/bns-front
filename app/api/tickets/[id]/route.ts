import { TICKET_PRIORITY, TICKET_STATUS, enumLabel, isEnumValue } from "@/lib/enums";
import { ticketCode } from "@/lib/format";
import type { Ticket, TicketAction } from "@/lib/types";
import { requireAuth } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, insert, mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, forbidden, json, notFound, readJson, route, str } from "@/server/http";
import { loadRefs } from "@/server/org";
import { allowedActions, engineerIds, loadTicketView } from "@/server/tickets";

export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  return json(await loadTicketView(id));
});

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  const body = await readJson(req);
  const action = body.action as TicketAction;
  const ticket = await findById("tickets", id);
  if (!ticket) throw notFound("Заявка не найдена");
  const purchases = await readTable("purchase_requests");
  if (!allowedActions(ctx, ticket, purchases).includes(action) || action === "comment" || action === "request_purchase") {
    throw forbidden("Действие недоступно для текущего статуса заявки или ваших прав");
  }

  const patch: Partial<Ticket> = {};
  let note = "";
  const { refs } = await loadRefs();
  switch (action) {
    case "take":
      patch.assigneeEmployeeId = ctx.employee.id;
      patch.status = "in_progress";
      note = `Заявку взял в работу: ${refs.get(ctx.employee.id)?.shortName}`;
      break;
    case "assign": {
      const assignee = str(body.assigneeEmployeeId, "Исполнитель", { required: true });
      if (!(await engineerIds()).has(assignee)) throw badRequest("Выбранный сотрудник не является инженером ИТ-поддержки");
      patch.assigneeEmployeeId = assignee;
      if (ticket.status === "new") patch.status = "in_progress";
      note = `Назначен исполнитель: ${refs.get(assignee)?.shortName}`;
      break;
    }
    case "set_priority":
      if (!isEnumValue(TICKET_PRIORITY, body.priority)) throw badRequest("Некорректный приоритет");
      patch.priority = body.priority;
      note = `Приоритет изменён: ${enumLabel(TICKET_PRIORITY, ticket.priority)} → ${enumLabel(TICKET_PRIORITY, body.priority)}`;
      break;
    case "resolve":
      patch.resolution = str(body.resolution, "Описание решения", { required: true, max: 5000 });
      patch.status = "resolved";
      patch.resolvedAt = nowISO();
      note = "Работы выполнены, заявка передана на проверку руководителю ИТ-поддержки";
      break;
    case "resume":
      patch.status = "in_progress";
      note = "Работы по заявке возобновлены";
      break;
    case "verify":
      patch.status = "closed";
      patch.closedAt = nowISO();
      patch.verifiedByUserId = ctx.user.id;
      note = "Выполнение подтверждено, заявка закрыта";
      break;
    case "return":
      patch.status = "in_progress";
      patch.resolvedAt = null;
      note = `Возвращена на доработку: ${str(body.comment, "Комментарий", { required: true, max: 2000 })}`;
      break;
    case "cancel":
      patch.status = "cancelled";
      patch.closedAt = nowISO();
      note = `Заявка отменена${body.comment ? `: ${str(body.comment, "Комментарий", { max: 2000 })}` : ""}`;
      break;
  }

  const before = { ...ticket };
  const updated = await mutate("tickets", (rows) => {
    const t = rows.find((r) => r.id === id)!;
    Object.assign(t, patch, { updatedAt: nowISO() });
    return t;
  });
  await insert("ticket_comments", { id: newId(), ticketId: id, userId: ctx.user.id, text: note, kind: "system", createdAt: nowISO() });
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(patch) as (keyof Ticket)[]) {
    if (k === "status") changes[k] = { from: enumLabel(TICKET_STATUS, before.status), to: enumLabel(TICKET_STATUS, updated.status) };
    else if (k === "assigneeEmployeeId") changes[k] = { from: before.assigneeEmployeeId ? refs.get(before.assigneeEmployeeId)?.shortName : null, to: refs.get(updated.assigneeEmployeeId!)?.shortName };
    else changes[k] = { from: before[k], to: updated[k] };
  }
  await audit({
    app: "it",
    action: `ticket.${action}`,
    entityType: "ticket",
    entityId: id,
    userId: ctx.user.id,
    summary: `${ticketCode(ticket.number)}: ${note}`,
    changes,
  });
  return json(await loadTicketView(id));
});
