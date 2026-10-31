"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, Spinner } from "./card";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  emptyTitle = "Нет данных",
  emptyDescription,
  toolbar,
  pageSize = 25,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const total = rows?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = useMemo(() => (rows ?? []).slice(current * pageSize, current * pageSize + pageSize), [rows, current, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      {toolbar && <div className="flex flex-wrap items-center gap-3 px-6 py-4">{toolbar}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted ${c.headerClassName ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-line transition-colors ${onRowClick ? "cursor-pointer hover:bg-hover" : ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-6 py-4 align-middle text-fg-muted ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {loading && <Spinner />}
      {!loading && total === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-6 py-3 text-xs text-fg-muted">
          <span>
            {current * pageSize + 1}–{Math.min(total, (current + 1) * pageSize)} из {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded-md p-1.5 hover:bg-hover disabled:opacity-40"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              aria-label="Назад"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              {current + 1} / {pages}
            </span>
            <button
              className="rounded-md p-1.5 hover:bg-hover disabled:opacity-40"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              aria-label="Вперёд"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CellTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-fg">{children}</div>
      {sub && <div className="truncate text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}
