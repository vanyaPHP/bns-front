"use client";

import { use, useState } from "react";
import { Ban, Check, CircleCheck, CircleDashed, CircleX, X } from "lucide-react";
import { APPROVAL_STATUS, LEAVE_STATUS, LEAVE_TYPE, enumLabel, type ApprovalStatus } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ApprovalStep, EmployeeRef, LeaveDTO } from "@/lib/types";
import { Avatar, Button, Card, CardHeader, DescriptionList, EnumBadge, ErrorBox, Field, Modal, PageHeader, Spinner, Textarea, useToast } from "@/components/ui";

const ICON: Record<ApprovalStatus, React.ReactNode> = {
  pending: <CircleDashed className="h-5 w-5 text-amber-500" />,
  approved: <CircleCheck className="h-5 w-5 text-emerald-500" />,
  rejected: <CircleX className="h-5 w-5 text-red-500" />,
  skipped: <CircleDashed className="h-5 w-5 text-fg-subtle" />,
};

function Step({ title, step, person }: { title: string; step: ApprovalStep; person: EmployeeRef | null }) {
  return (
    <div className="flex gap-3">
      {ICON[step.status]}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">{title}</span>
          <EnumBadge map={APPROVAL_STATUS} value={step.status} />
        </div>
        {person && (
          <div className="mt-2 flex items-center gap-2">
            <Avatar name={person.fullName} size="sm" />
            <div>
              <div className="text-sm text-fg">{person.fullName}</div>
              <div className="text-xs text-fg-subtle">{person.position}</div>
            </div>
          </div>
        )}
        {step.decidedAt && <div className="mt-1 text-xs text-fg-subtle">{formatDateTime(step.decidedAt)}</div>}
        {step.comment && <div className="mt-1 text-sm italic text-fg-muted">«{step.comment}»</div>}
      </div>
    </div>
  );
}

export default function LeaveRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const { data: l, error, mutate } = useApi<LeaveDTO>(`/api/leave/${id}`);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBox message={error} />;
  if (!l) return <Spinner />;

  const act = async (action: "approve" | "reject" | "cancel", c = "") => {
    setBusy(true);
    try {
      const res = await apiFetch<LeaveDTO>(`/api/leave/${id}`, { method: "PATCH", body: { action, comment: c } });
      mutate(() => res);
      toast.success(`Статус: ${enumLabel(LEAVE_STATUS, res.status)}`);
      setRejecting(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Заявления" }, { label: `№${l.number}` }]}
        title={`Заявление №${l.number}`}
        description={
          <span className="flex items-center gap-2">
            <EnumBadge map={LEAVE_TYPE} value={l.type} />
            <EnumBadge map={LEAVE_STATUS} value={l.status} dot />
          </span>
        }
        actions={
          <>
            {l.canApproveAs.length > 0 && (
              <>
                <Button variant="success" icon={<Check className="h-4 w-4" />} loading={busy} onClick={() => act("approve")}>
                  Согласовать {l.canApproveAs.length > 1 ? "(руководитель и HR)" : l.canApproveAs[0] === "head" ? "как руководитель" : "как HR"}
                </Button>
                <Button icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)}>
                  Отклонить
                </Button>
              </>
            )}
            {l.canCancel && (
              <Button variant="ghost" icon={<Ban className="h-4 w-4" />} loading={busy} onClick={() => window.confirm("Отменить заявление?") && act("cancel")}>
                Отменить заявление
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Сведения" />
          <div className="p-6">
            <DescriptionList
              items={[
                { label: "Сотрудник", value: l.employee?.fullName },
                { label: "Подразделение", value: l.employee?.departmentName },
                { label: "Тип", value: enumLabel(LEAVE_TYPE, l.type) },
                { label: "Продолжительность", value: `${l.days} календарных дней` },
                { label: "Дата начала", value: formatDate(l.startDate) },
                { label: "Дата окончания", value: formatDate(l.endDate) },
                { label: "Подано", value: formatDateTime(l.createdAt) },
                { label: "Обновлено", value: formatDateTime(l.updatedAt) },
                { label: "Комментарий", value: l.reason, span: true },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Маршрут согласования" />
          <div className="flex flex-col gap-6 p-6">
            <Step title="Руководитель подразделения" step={l.headApproval} person={l.headApprover} />
            <div className="ml-2.5 h-6 border-l border-dashed border-line-strong" />
            <Step title="HR-менеджер" step={l.hrApproval} person={l.hrApprover} />
          </div>
        </Card>
      </div>
      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Отклонить заявление"
        footer={
          <>
            <Button onClick={() => setRejecting(false)}>Отмена</Button>
            <Button variant="danger" loading={busy} onClick={() => act("reject", comment)}>
              Отклонить
            </Button>
          </>
        }
      >
        <Field label="Причина" required>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
