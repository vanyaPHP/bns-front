import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AuditLog,
  Department,
  Employee,
  EmployeeDocument,
  Hardware,
  LeaveRequest,
  PurchaseRequest,
  Role,
  Session,
  Ticket,
  TicketComment,
  User,
} from "@/lib/types";

export interface Tables {
  departments: Department;
  employees: Employee;
  users: User;
  roles: Role;
  sessions: Session;
  audit_logs: AuditLog;
  hardware: Hardware;
  tickets: Ticket;
  ticket_comments: TicketComment;
  purchase_requests: PurchaseRequest;
  employee_documents: EmployeeDocument;
  leave_requests: LeaveRequest;
}

export type TableName = keyof Tables;

export const TABLE_NAMES: TableName[] = [
  "departments",
  "employees",
  "users",
  "roles",
  "sessions",
  "audit_logs",
  "hardware",
  "tickets",
  "ticket_comments",
  "purchase_requests",
  "employee_documents",
  "leave_requests",
];

// Serverless deployments (Vercel) have a read-only filesystem except /tmp.
export const DATA_DIR =
  process.env.BNS_DATA_DIR ?? (process.env.VERCEL ? "/tmp/bns-data" : path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Survive dev-server hot reloads so locks and the seeding promise stay singletons.
const g = globalThis as unknown as {
  __bnsLocks?: Map<string, Promise<unknown>>;
  __bnsSeeding?: Promise<void> | null;
};
const locks = (g.__bnsLocks ??= new Map());

function tablePath(name: TableName) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureSeeded() {
  if (await exists(tablePath("users"))) return;
  g.__bnsSeeding ??= (async () => {
    const { buildSeed } = await import("./seed");
    const data = await buildSeed();
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    for (const name of TABLE_NAMES) {
      await writeFileAtomic(tablePath(name), (data[name] ?? []) as unknown[]);
    }
  })().finally(() => {
    g.__bnsSeeding = null;
  });
  await g.__bnsSeeding;
}

async function writeFileAtomic(file: string, rows: unknown[]) {
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readRaw<K extends TableName>(name: K): Promise<Tables[K][]> {
  await ensureSeeded();
  const file = tablePath(name);
  if (!(await exists(file))) return [];
  const text = await fs.readFile(file, "utf8");
  return text.trim() ? (JSON.parse(text) as Tables[K][]) : [];
}

function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(name) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(
    name,
    next.catch(() => undefined),
  );
  return next;
}

export async function readTable<K extends TableName>(name: K): Promise<Tables[K][]> {
  // Wait for any pending write on this table to avoid reading a half-applied mutation.
  await (locks.get(name) ?? Promise.resolve());
  return readRaw(name);
}

export async function findById<K extends TableName>(name: K, id: string): Promise<Tables[K] | undefined> {
  const rows = await readTable(name);
  return rows.find((r) => (r as { id: string }).id === id);
}

/**
 * Serialised read-modify-write of a table. The callback may mutate `rows` in place;
 * the array is persisted afterwards unless the callback throws.
 */
export function mutate<K extends TableName, R>(name: K, fn: (rows: Tables[K][]) => R | Promise<R>): Promise<R> {
  return withLock(name, async () => {
    const rows = await readRaw(name);
    const result = await fn(rows);
    await writeFileAtomic(tablePath(name), rows);
    return result;
  });
}

export async function insert<K extends TableName>(name: K, row: Tables[K]): Promise<Tables[K]> {
  await mutate(name, (rows) => {
    rows.push(row);
  });
  return row;
}

export function newId(): string {
  return randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function nextNumber(rows: { number: number }[], start = 1): number {
  return rows.reduce((max, r) => Math.max(max, r.number), start - 1) + 1;
}
