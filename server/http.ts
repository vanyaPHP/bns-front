import "server-only";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = "Недостаточно прав для выполнения операции") => new HttpError(403, msg);
export const notFound = (msg = "Объект не найден") => new HttpError(404, msg);

type RouteCtx = { params: Promise<Record<string, string>> };

export function route(fn: (req: Request, ctx: RouteCtx) => Promise<Response>) {
  return async (req: Request, ctx: RouteCtx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
  };
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Некорректное тело запроса");
  }
}

export function str(value: unknown, field: string, opts: { required?: boolean; max?: number } = {}): string {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (opts.required && !v) throw badRequest(`Поле «${field}» обязательно для заполнения`);
  if (opts.max && v.length > opts.max) throw badRequest(`Поле «${field}» слишком длинное`);
  return v;
}

export function isoDate(value: unknown, field: string, required = true): string {
  const v = str(value, field, { required });
  if (!v) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw badRequest(`Поле «${field}» должно быть датой`);
  return v;
}
