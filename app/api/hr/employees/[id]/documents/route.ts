import { DOCUMENT_TYPE, enumLabel } from "@/lib/enums";
import { fullName } from "@/lib/format";
import type { DocumentDTO } from "@/lib/types";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, insert, readTable } from "@/server/db";
import { json, notFound, route } from "@/server/http";
import { loadRefs } from "@/server/org";
import { storeUpload } from "@/server/uploads";

export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const [docs, users, { refs }] = await Promise.all([readTable("employee_documents"), readTable("users"), loadRefs()]);
  const rows: DocumentDTO[] = docs
    .filter((d) => d.employeeId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
      const u = users.find((x) => x.id === d.uploadedByUserId);
      return { ...d, employee: refs.get(d.employeeId) ?? null, uploadedBy: u ? refs.get(u.employeeId)?.shortName ?? u.login : "—" };
    });
  return json(rows);
});

export const POST = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.documents.manage");
  const employee = await findById("employees", id);
  if (!employee) throw notFound("Сотрудник не найден");
  const doc = await storeUpload(await req.formData(), id, ctx.user.id);
  await insert("employee_documents", doc);
  await audit({
    app: "hr",
    action: "document.upload",
    entityType: "employee",
    entityId: id,
    userId: ctx.user.id,
    summary: `Загружен документ «${doc.title}» (${enumLabel(DOCUMENT_TYPE, doc.type)}) — ${fullName(employee)}`,
  });
  return json(doc, { status: 201 });
});
