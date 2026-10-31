import { HARDWARE_TYPE, enumLabel } from "@/lib/enums";
import type { Hardware } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { mutate, newId, nowISO, readTable } from "@/server/db";
import { badRequest, json, readJson, route, str } from "@/server/http";
import { enrichHardware, parseHardwareFields } from "@/server/hardware";

export const GET = route(async () => {
  const ctx = await requireAuth();
  requirePermission(ctx, "it.hardware.view", "it.hardware.manage");
  const rows = await readTable("hardware");
  rows.sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber));
  return json(await enrichHardware(rows));
});

export const POST = route(async (req) => {
  const ctx = await requireAuth();
  requirePermission(ctx, "it.hardware.manage");
  const body = await readJson(req);
  const fields = parseHardwareFields(body);
  const employeeId = str(body.employeeId, "Сотрудник") || null;
  if (employeeId) {
    const employees = await readTable("employees");
    if (!employees.some((e) => e.id === employeeId)) throw badRequest("Сотрудник не найден");
  }
  const now = nowISO();
  const hw = await mutate("hardware", (rows) => {
    if (rows.some((r) => r.inventoryNumber.toLowerCase() === fields.inventoryNumber.toLowerCase())) {
      throw badRequest("Оборудование с таким инвентарным номером уже существует");
    }
    const h: Hardware = {
      id: newId(),
      ...fields,
      status: employeeId ? "assigned" : fields.status === "assigned" ? "in_stock" : fields.status,
      employeeId,
      assignedAt: employeeId ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    rows.push(h);
    return h;
  });
  await audit({
    app: "it",
    action: "hardware.create",
    entityType: "hardware",
    entityId: hw.id,
    userId: ctx.user.id,
    summary: `Добавлено оборудование ${hw.inventoryNumber}: ${enumLabel(HARDWARE_TYPE, hw.type)} ${hw.manufacturer} ${hw.model}`,
  });
  return json(hw, { status: 201 });
});
