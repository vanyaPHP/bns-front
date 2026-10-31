import { ticketCode } from "@/lib/format";
import { requireAuth } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, insert, newId, nowISO, readTable } from "@/server/db";
import { forbidden, json, notFound, readJson, route, str } from "@/server/http";
import { allowedActions } from "@/server/tickets";

export const POST = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  const ticket = await findById("tickets", id);
  if (!ticket) throw notFound("Заявка не найдена");
  const purchases = await readTable("purchase_requests");
  if (!allowedActions(ctx, ticket, purchases).includes("comment")) throw forbidden("Нельзя комментировать эту заявку");
  const body = await readJson(req);
  const text = str(body.text, "Комментарий", { required: true, max: 5000 });
  const comment = await insert("ticket_comments", { id: newId(), ticketId: id, userId: ctx.user.id, text, kind: "comment", createdAt: nowISO() });
  await audit({
    app: "it",
    action: "ticket.comment",
    entityType: "ticket",
    entityId: id,
    userId: ctx.user.id,
    summary: `${ticketCode(ticket.number)}: добавлен комментарий`,
  });
  return json(comment, { status: 201 });
});
