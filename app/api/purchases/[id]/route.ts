import { PURCHASE_STATUS, enumLabel } from "@/lib/enums";
import { ticketCode } from "@/lib/format";
import type { PurchaseStatus } from "@/lib/enums";
import { requireAuth } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, insert, mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, forbidden, json, notFound, readJson, route, str } from "@/server/http";

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  const body = await readJson(req);
  const action = body.action as "approve" | "reject" | "deliver";
  const purchase = await findById("purchase_requests", id);
  if (!purchase) throw notFound("Запрос на закупку не найден");
  const comment = str(body.comment, "Комментарий", { max: 2000 });

  let next: PurchaseStatus;
  if (action === "approve" || action === "reject") {
    if (!ctx.permissions.has("it.purchases.approve")) throw forbidden("Согласование закупок доступно только руководителю ИТ-поддержки");
    if (purchase.status !== "in_progress") throw badRequest("Запрос уже рассмотрен");
    if (action === "reject" && !comment) throw badRequest("Укажите причину отклонения");
    next = action === "approve" ? "approved" : "rejected";
  } else if (action === "deliver") {
    const allowed = ctx.permissions.has("it.purchases.approve") || purchase.requestedByUserId === ctx.user.id;
    if (!allowed) throw forbidden();
    if (purchase.status !== "approved") throw badRequest("Отметить получение можно только для одобренной закупки");
    next = "delivered";
  } else {
    throw badRequest("Неизвестное действие");
  }

  const now = nowISO();
  const decided = action !== "deliver";
  const updated = await mutate("purchase_requests", (rows) => {
    const p = rows.find((r) => r.id === id)!;
    p.status = next;
    p.updatedAt = now;
    if (decided) {
      p.decidedByUserId = ctx.user.id;
      p.decidedAt = now;
      p.decisionComment = comment;
    }
    return p;
  });

  // Rejected or delivered purchases unblock the ticket once nothing else is pending.
  const ticket = await findById("tickets", purchase.ticketId);
  if (ticket && next !== "approved") {
    const all = await readTable("purchase_requests");
    await mutate("tickets", (rows) => {
      const stillOpen = all.some((p) => p.ticketId === ticket.id && p.id !== id && (p.status === "in_progress" || p.status === "approved"));
      const t = rows.find((r) => r.id === ticket.id)!;
      if (t.status === "waiting_purchase" && !stillOpen) {
        t.status = "in_progress";
        t.updatedAt = now;
      }
    });
  }
  if (ticket) {
    await insert("ticket_comments", {
      id: newId(),
      ticketId: ticket.id,
      userId: ctx.user.id,
      text: `Закупка №${purchase.number}: ${enumLabel(PURCHASE_STATUS, next)}${comment ? ` — ${comment}` : ""}`,
      kind: "system",
      createdAt: now,
    });
  }
  await audit({
    app: "it",
    action: `purchase.${action}`,
    entityType: "purchase",
    entityId: id,
    userId: ctx.user.id,
    summary: `Закупка №${purchase.number}${ticket ? ` (${ticketCode(ticket.number)})` : ""}: ${enumLabel(PURCHASE_STATUS, next)}`,
    changes: { status: { from: enumLabel(PURCHASE_STATUS, purchase.status), to: enumLabel(PURCHASE_STATUS, next) } },
  });
  return json(updated);
});
