import { TICKET_CATEGORY, TICKET_PRIORITY, isEnumValue } from "@/lib/enums";
import { ticketCode } from "@/lib/format";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { insert, mutate, newId, nextNumber, nowISO, readTable } from "@/server/db";
import { badRequest, forbidden, json, readJson, route, str } from "@/server/http";
import { managedDepartmentIds } from "@/server/org";
import { enrichTickets, myTicketFilter } from "@/server/tickets";
import type { Ticket } from "@/lib/types";

export const GET = route(async (req) => {
  const ctx = await requireAuth();
  const scope = new URL(req.url).searchParams.get("scope") ?? "my";
  let tickets = await readTable("tickets");
  if (scope === "all") {
    requirePermission(ctx, "it.tickets.view");
  } else {
    const filter = await myTicketFilter(ctx);
    tickets = tickets.filter(filter);
  }
  tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(await enrichTickets(tickets));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "portal.tickets.create");
  const body = await readJson(req);
  const title = str(body.title, "Тема", { required: true, max: 200 });
  const description = str(body.description, "Описание проблемы", { required: true, max: 5000 });
  if (!isEnumValue(TICKET_CATEGORY, body.category)) throw badRequest("Выберите категорию");
  if (!isEnumValue(TICKET_PRIORITY, body.priority)) throw badRequest("Выберите приоритет");

  const [employees, departments, hardware] = await Promise.all([
    readTable("employees"),
    readTable("departments"),
    readTable("hardware"),
  ]);
  const requesterId = str(body.requesterEmployeeId, "Сотрудник") || ctx.employee.id;
  const requester = employees.find((e) => e.id === requesterId);
  if (!requester) throw badRequest("Сотрудник не найден");
  if (requester.id !== ctx.employee.id) {
    // Department heads may file tickets on behalf of employees of their (sub)departments.
    const managed = managedDepartmentIds(departments, ctx.employee.id);
    if (!managed.has(requester.departmentId)) throw forbidden("Можно создавать заявки только для сотрудников своего подразделения");
  }
  const hardwareId = str(body.hardwareId, "Оборудование") || null;
  if (hardwareId) {
    const hw = hardware.find((h) => h.id === hardwareId);
    if (!hw || hw.employeeId !== requester.id) throw badRequest("Оборудование не закреплено за выбранным сотрудником");
  }

  const now = nowISO();
  const ticket = await mutate("tickets", (rows) => {
    const t: Ticket = {
      id: newId(),
      number: nextNumber(rows),
      title,
      description,
      category: body.category as Ticket["category"],
      priority: body.priority as Ticket["priority"],
      status: "new",
      requesterEmployeeId: requester.id,
      createdByUserId: ctx.user.id,
      departmentId: requester.departmentId,
      hardwareId,
      assigneeEmployeeId: null,
      resolution: "",
      resolvedAt: null,
      closedAt: null,
      verifiedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(t);
    return t;
  });
  await insert("ticket_comments", { id: newId(), ticketId: ticket.id, userId: ctx.user.id, text: "Заявка создана", kind: "system", createdAt: now });
  await audit({
    app: "it",
    action: "ticket.create",
    entityType: "ticket",
    entityId: ticket.id,
    userId: ctx.user.id,
    summary: `Создана заявка ${ticketCode(ticket.number)}: ${title}`,
  });
  const [dto] = await enrichTickets([ticket]);
  return json(dto, { status: 201 });
});
