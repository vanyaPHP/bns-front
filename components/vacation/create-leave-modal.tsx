"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { LEAVE_TYPE, enumOptions } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { daysBetweenInclusive, plural } from "@/lib/format";
import type { LeaveBalance } from "@/lib/types";
import { Button, Field, FormGrid, Input, Modal, Select, Textarea, useToast } from "@/components/ui";

export function CreateLeaveModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const toast = useToast();
  const [type, setType] = useState("annual");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const year = startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear();
  const { data: balance } = useApi<LeaveBalance>(open ? `/api/leave/balance?year=${year}` : null);
  const days = startDate && endDate && endDate >= startDate ? daysBetweenInclusive(startDate, endDate) : 0;

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/leave", { body: { type, startDate, endDate, reason } });
      toast.success("Заявление отправлено на согласование руководителю и HR-менеджеру");
      setStart("");
      setEnd("");
      setReason("");
      onClose();
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новое заявление"
      description="Заявление согласовывают руководитель подразделения и ваш HR-менеджер. Оно считается согласованным после обоих одобрений."
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" loading={saving} onClick={submit} icon={<CalendarPlus className="h-4 w-4" />}>
            Подать заявление
          </Button>
        </>
      }
    >
      <FormGrid>
        <Field label="Тип" required className="md:col-span-2">
          <Select value={type} onChange={(e) => setType(e.target.value)} options={enumOptions(LEAVE_TYPE)} />
        </Field>
        <Field label="Дата начала" required>
          <Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Дата окончания" required>
          <Input type="date" value={endDate} min={startDate} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label={type === "unpaid" ? "Причина" : "Комментарий"} required={type === "unpaid"} className="md:col-span-2">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={type === "sick" ? "Номер листка нетрудоспособности" : ""} />
        </Field>
      </FormGrid>
      <div className="mt-5 flex flex-wrap gap-6 rounded-xl border border-line bg-muted/50 px-4 py-3 text-sm">
        <span className="text-fg-muted">
          Продолжительность: <b className="text-fg">{days} {plural(days, "день", "дня", "дней")}</b>
        </span>
        {type === "annual" && balance && (
          <span className="text-fg-muted">
            Доступно в {balance.year}: <b className={days > balance.remaining ? "text-red-500" : "text-fg"}>{balance.remaining} дн.</b> из {balance.entitlement}
          </span>
        )}
      </div>
    </Modal>
  );
}
