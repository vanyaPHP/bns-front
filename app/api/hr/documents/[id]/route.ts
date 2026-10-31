import fs from "node:fs/promises";
import { DOCUMENT_TYPE, enumLabel } from "@/lib/enums";
import { requireAuth, requirePermission } from "@/server/auth";
import { audit } from "@/server/audit";
import { findById, mutate } from "@/server/db";
import { json, notFound, route } from "@/server/http";
import { loadRefs } from "@/server/org";
import { uploadPath } from "@/server/uploads";

export const GET = route(async (req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.employees.view");
  const doc = await findById("employee_documents", id);
  if (!doc) throw notFound("Документ не найден");
  let data: Buffer;
  try {
    data = await fs.readFile(uploadPath(doc.storedName));
  } catch {
    throw notFound("Файл документа отсутствует в хранилище");
  }
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = route(async (_req, { params }) => {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePermission(ctx, "hr.documents.manage");
  const doc = await findById("employee_documents", id);
  if (!doc) throw notFound("Документ не найден");
  await mutate("employee_documents", (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
  });
  await fs.rm(uploadPath(doc.storedName), { force: true });
  const { refs } = await loadRefs();
  await audit({
    app: "hr",
    action: "document.delete",
    entityType: "employee",
    entityId: doc.employeeId,
    userId: ctx.user.id,
    summary: `Удалён документ «${doc.title}» (${enumLabel(DOCUMENT_TYPE, doc.type)}) — ${refs.get(doc.employeeId)?.fullName ?? ""}`,
  });
  return json({ ok: true });
});
