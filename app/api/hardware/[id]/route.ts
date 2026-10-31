import { HARDWARE_STATUS, enumLabel, isEnumValue } from "@/lib/enums";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit, diff } from "@/server/audit";
import { findById, mutate, nowISO, readTable } from "@/server/db";
import { badRequest, json, notFound, readJson, route, str } from "@/server/http";
import { parseHardwareFields } from "@/server/hardware";
import { loadRefs } from "@/server/org";

export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "it.hardware.manage");
  const body = await readJson(req);
  const current = await findById("hardware", id);
  if (!current) throw notFound("Оборудование не найдено");
  const { refs } = await loadRefs();
  const now = nowISO();
  let summary = "";

  const updated = await mutate("hardware", async (rows) => {
    const h = rows.find((r) => r.id === id)!;
    switch (body.action) {
      case "assign": {
        const employeeId = str(body.employeeId, "Сотрудник", { required: true });
        const employees = await readTable("employees");
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp || emp.status === "dismissed") throw badRequest("Сотрудник не найден или уволен");
        if (h.status === "written_off") throw badRequest("Списанное оборудование нельзя выдать");
        h.employeeId = employeeId;
        h.status = "assigned";
        h.assignedAt = now;
        summary = `${h.inventoryNumber} выдано сотруднику ${refs.get(employeeId)?.shortName}`;
        break;
      }
      case "unassign": {
        const prev = h.employeeId;
        if (!prev) throw badRequest("Оборудование не закреплено за сотрудником");
        const status = body.status ?? "in_stock";
        if (!isEnumValue(HARDWARE_STATUS, status) || status === "assigned") throw badRequest("Некорректный статус");
        h.employeeId = null;
        h.assignedAt = null;
        h.status = status;
        summary = `${h.inventoryNumber} изъято у сотрудника ${refs.get(prev)?.shortName} (${enumLabel(HARDWARE_STATUS, status)})`;
        break;
      }
      case "update": {
        const fields = parseHardwareFields(body);
        if (rows.some((r) => r.id !== id && r.inventoryNumber.toLowerCase() === fields.inventoryNumber.toLowerCase())) {
          throw badRequest("Оборудование с таким инвентарным номером уже существует");
        }
        // Assignment is managed by assign/unassign only.
        Object.assign(h, fields, { status: h.employeeId ? "assigned" : fields.status === "assigned" ? "in_stock" : fields.status });
        summary = `Изменены сведения об оборудовании ${h.inventoryNumber}`;
        break;
      }
      default:
        throw badRequest("Неизвестное действие");
    }
    h.updatedAt = now;
    return { ...h };
  });

  await audit({
    app: "it",
    action: `hardware.${body.action}`,
    entityType: "hardware",
    entityId: id,
    userId: ctx.user.id,
    summary,
    changes: diff(current, updated),
  });
  return json(updated);
});
