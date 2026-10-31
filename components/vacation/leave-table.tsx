"use client";

import { useRouter } from "next/navigation";
import { APPROVAL_STATUS, LEAVE_STATUS, LEAVE_TYPE, type ApprovalStatus } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import type { LeaveDTO } from "@/lib/types";
import { CellTitle, DataTable, DOT, EnumBadge } from "@/components/ui";

function StepDot({ status, label }: { status: ApprovalStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs" title={`${label}: ${APPROVAL_STATUS[status].label}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[APPROVAL_STATUS[status].tone]}`} />
      {label}
    </span>
  );
}

export function LeaveTable({
  rows,
  loading,
  showEmployee,
  emptyTitle = "Заявлений нет",
  toolbar,
  actions,
}: {
  rows: LeaveDTO[] | undefined;
  loading?: boolean;
  showEmployee?: boolean;
  emptyTitle?: string;
  toolbar?: React.ReactNode;
  actions?: (l: LeaveDTO) => React.ReactNode;
}) {
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      loading={loading}
      rowKey={(l) => l.id}
      onRowClick={(l) => router.push(`/vacation/requests/${l.id}`)}
      emptyTitle={emptyTitle}
      toolbar={toolbar}
      columns={[
        { key: "n", header: "№", render: (l) => <span className="font-mono text-xs font-semibold text-fg">№{l.number}</span> },
        ...(showEmployee
          ? [{ key: "emp", header: "Сотрудник", render: (l: LeaveDTO) => <CellTitle sub={l.employee?.departmentName}>{l.employee?.fullName}</CellTitle> }]
          : []),
        { key: "type", header: "Тип", render: (l) => <EnumBadge map={LEAVE_TYPE} value={l.type} /> },
        {
          key: "period",
          header: "Период",
          render: (l) => (
            <CellTitle sub={`${l.days} дн.`}>
              {formatDate(l.startDate)} — {formatDate(l.endDate)}
            </CellTitle>
          ),
        },
        {
          key: "approvals",
          header: "Согласования",
          render: (l) => (
            <div className="flex flex-col gap-1">
              <StepDot status={l.headApproval.status} label={`Руководитель${l.headApprover ? `: ${l.headApprover.shortName}` : ""}`} />
              <StepDot status={l.hrApproval.status} label={`HR${l.hrApprover ? `: ${l.hrApprover.shortName}` : ""}`} />
            </div>
          ),
        },
        { key: "status", header: "Статус", render: (l) => <EnumBadge map={LEAVE_STATUS} value={l.status} dot /> },
        { key: "created", header: "Подано", render: (l) => formatDate(l.createdAt) },
        ...(actions ? [{ key: "actions", header: "", render: (l: LeaveDTO) => <div onClick={(e) => e.stopPropagation()}>{actions(l)}</div> }] : []),
      ]}
    />
  );
}
