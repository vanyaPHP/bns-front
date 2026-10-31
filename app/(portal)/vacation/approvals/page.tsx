"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { apiFetch, useApi } from "@/lib/api-client";
import type { LeaveDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Button, Field, Modal, PageHeader, Tabs, Textarea, useToast } from "@/components/ui";
import { LeaveTable } from "@/components/vacation/leave-table";

export default function ApprovalsPage() {
  const session = useSession();
  return (
    <Guard allow={session.isApprover}>
      <Approvals />
    </Guard>
  );
}

function Approvals() {
  const toast = useToast();
  const { data, loading, reload } = useApi<LeaveDTO[]>("/api/leave?scope=approvals");
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [rejecting, setRejecting] = useState<LeaveDTO | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pending = (data ?? []).filter((l) => l.canApproveAs.length > 0);
  const done = (data ?? []).filter((l) => l.canApproveAs.length === 0);

  const act = async (l: LeaveDTO, action: "approve" | "reject", c = "") => {
    setBusy(l.id);
    try {
      const res = await apiFetch<LeaveDTO>(`/api/leave/${l.id}`, { method: "PATCH", body: { action, comment: c } });
      toast.success(
        action === "reject"
          ? `Заявление №${l.number} отклонено`
          : res.status === "approved"
            ? `Заявление №${l.number} полностью согласовано`
            : `Ваше согласование учтено. Ожидается второе согласование`,
      );
      setRejecting(null);
      setComment("");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Согласование" }]}
        title="Согласование заявлений"
        description="Заявления сотрудников, где вы — руководитель подразделения или ответственный HR-менеджер. Заявление согласовано после одобрения обеих сторон."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Ожидают решения", count: pending.length },
          { value: "done", label: "Обработанные", count: done.length },
        ]}
      />
      <LeaveTable
        rows={tab === "pending" ? pending : done}
        loading={loading}
        showEmployee
        emptyTitle={tab === "pending" ? "Нет заявлений, ожидающих вашего решения" : "Обработанных заявлений нет"}
        actions={
          tab === "pending"
            ? (l) => (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} loading={busy === l.id} onClick={() => act(l, "approve")}>
                    Согласовать
                  </Button>
                  <Button size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(l)}>
                    Отклонить
                  </Button>
                </div>
              )
            : undefined
        }
      />
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Отклонить заявление №${rejecting?.number}`}
        description={rejecting?.employee?.fullName}
        footer={
          <>
            <Button onClick={() => setRejecting(null)}>Отмена</Button>
            <Button variant="danger" loading={busy === rejecting?.id} onClick={() => rejecting && act(rejecting, "reject", comment)}>
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
