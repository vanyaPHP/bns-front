import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { DOCUMENT_TYPE, isEnumValue } from "@/lib/enums";
import type { EmployeeDocument } from "@/lib/types";
import { UPLOADS_DIR, newId, nowISO } from "./db";
import { badRequest } from "./http";

const MAX_SIZE = 10 * 1024 * 1024;
// MIME type is derived from the whitelisted extension, never trusted from the client.
const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

export async function storeUpload(form: FormData, employeeId: string, userId: string): Promise<EmployeeDocument> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest("Выберите файл");
  if (file.size > MAX_SIZE) throw badRequest("Размер файла не должен превышать 10 МБ");
  const ext = path.extname(file.name).toLowerCase();
  if (!MIME_BY_EXT[ext]) throw badRequest("Допустимые форматы: PDF, PNG, JPG, DOC(X), XLS(X), TXT");
  const type = form.get("type");
  if (!isEnumValue(DOCUMENT_TYPE, type)) throw badRequest("Выберите тип документа");
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || file.name;

  const id = newId();
  const storedName = `${id}${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  return {
    id,
    employeeId,
    type,
    title,
    fileName: path.basename(file.name),
    storedName,
    mimeType: MIME_BY_EXT[ext],
    size: file.size,
    uploadedByUserId: userId,
    createdAt: nowISO(),
  };
}

export function uploadPath(storedName: string) {
  // storedName is generated server-side, basename() guards against traversal anyway.
  return path.join(UPLOADS_DIR, path.basename(storedName));
}
