import { ticketCode } from "@/lib/format";
import type { PurchaseItem, PurchaseRequest } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, insert, mutate, newId, nextNumber, nowISO, readTable } from "@/server/db";
import { badRequest, forbidden, json, notFound, readJson, route, str } from "@/server/http";
import { loadRefs } from "@/server/org";
import { allowedActions } from "@/server/tickets";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "it.purchases.request", "it.purchases.approve");
  const [purchases, tickets, users, { refs }] = await Promise.all([
    readTable("purchase_requests"),
    readTable("tickets"),
    readTable("users"),
    loadRefs(),
  ]);
  const userRef = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? refs.get(u.employeeId) ?? null : null;
  };
  return json(
    purchases
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => {
        const t = tickets.find((x) => x.id === p.ticketId);
        return {
          ...p,
          total: p.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
          ticket: t ? { id: t.id, code: ticketCode(t.number), title: t.title } : null,
          requestedBy: userRef(p.requestedByUserId),
          decidedBy: userRef(p.decidedByUserId),
        };
      }),
  );
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "it.purchases.request");
  const body = await readJson(req);
  const ticket = await findById("tickets", str(body.ticketId, "Заявка", { required: true }));
  if (!ticket) throw notFound("Заявка не найдена");
  const all = await readTable("purchase_requests");
  if (!allowedActions(ctx, ticket, all).includes("request_purchase")) throw forbidden("Запрос закупки по этой заявке недоступен");
  const justification = str(body.justification, "Обоснование", { required: true, max: 2000 });
  const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const items: PurchaseItem[] = rawItems
    .map((i) => ({ name: str(i.name, "Наименование", { max: 200 }), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
    .filter((i) => i.name);
  if (!items.length) throw badRequest("Добавьте хотя бы одну позицию");
  if (items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) {
    throw badRequest("Проверьте количество и цену позиций");
  }
  const now = nowISO();
  const purchase = await mutate("purchase_requests", (rows) => {
    const p: PurchaseRequest = {
      id: newId(),
      number: nextNumber(rows),
      ticketId: ticket.id,
      requestedByUserId: ctx.user.id,
      items,
      justification,
      status: "in_progress",
      decidedByUserId: null,
      decidedAt: null,
      decisionComment: "",
      createdAt: now,
      updatedAt: now,
    };
    rows.push(p);
    return p;
  });
  await mutate("tickets", (rows) => {
    const t = rows.find((r) => r.id === ticket.id)!;
    t.status = "waiting_purchase";
    t.updatedAt = now;
  });
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  await insert("ticket_comments", {
    id: newId(),
    ticketId: ticket.id,
    userId: ctx.user.id,
    text: `Создан запрос на закупку №${purchase.number} на сумму ${total.toFixed(2)} BYN — ожидает согласования`,
    kind: "system",
    createdAt: now,
  });
  await audit({
    app: "it",
    action: "purchase.create",
    entityType: "purchase",
    entityId: purchase.id,
    userId: ctx.user.id,
    summary: `Запрос на закупку №${purchase.number} по заявке ${ticketCode(ticket.number)} (${total.toFixed(2)} BYN)`,
  });
  return json(purchase, { status: 201 });
});
