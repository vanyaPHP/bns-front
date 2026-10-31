"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { HARDWARE_TYPE, TICKET_CATEGORY, TICKET_PRIORITY, enumLabel, enumOptions } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import type { EmployeeRef, HardwareDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Button, Field, FormGrid, Input, Modal, Select, Textarea, useToast } from "@/components/ui";

export function CreateTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const session = useSession();
  const toast = useToast();
  const isHead = session.headOfDepartmentIds.length > 0;
  const [requesterId, setRequesterId] = useState(session.employee.id);
  const [hardwareId, setHardwareId] = useState("");
  const [category, setCategory] = useState("hardware");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: managed } = useApi<EmployeeRef[]>(open && isHead ? "/api/lookup/employees?scope=managed" : null);
  const { data: hardware, loading: hwLoading } = useApi<HardwareDTO[]>(open ? `/api/my/hardware?employeeId=${requesterId}` : null);

  const employeeOptions = useMemo(
    () => (managed ?? []).map((e) => ({ value: e.id, label: `${e.fullName}${e.id === session.employee.id ? " (я)" : ""} — ${e.departmentName}` })),
    [managed, session.employee.id],
  );

  const reset = () => {
    setRequesterId(session.employee.id);
    setHardwareId("");
    setTitle("");
    setDescription("");
    setCategory("hardware");
    setPriority("medium");
  };

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/tickets", {
        body: { requesterEmployeeId: requesterId, hardwareId: hardwareId || null, category, priority, title, description },
      });
      toast.success("Заявка отправлена в ИТ-поддержку");
      reset();
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
      size="lg"
      title="Новая заявка в ИТ-поддержку"
      description="Опишите проблему — инженер свяжется с вами после назначения"
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" loading={saving} onClick={submit} icon={<Send className="h-4 w-4" />}>
            Отправить заявку
          </Button>
        </>
      }
    >
      <FormGrid>
        {isHead && (
          <Field
            label="Сотрудник"
            required
            hint="Как руководитель вы можете создать заявку для любого сотрудника своего подразделения"
            className="md:col-span-2"
          >
            <Select
              value={requesterId}
              onChange={(e) => {
                setRequesterId(e.target.value);
                setHardwareId("");
              }}
              options={employeeOptions.length ? employeeOptions : [{ value: session.employee.id, label: session.employee.fullName }]}
            />
          </Field>
        )}
        <Field
          label="Оборудование"
          hint={hwLoading ? "Загрузка…" : hardware?.length ? "Выберите закреплённое оборудование, с которым возникла проблема" : "За сотрудником не закреплено оборудование"}
          className="md:col-span-2"
        >
          <Select
            value={hardwareId}
            onChange={(e) => setHardwareId(e.target.value)}
            placeholder="Без привязки к оборудованию"
            options={(hardware ?? []).map((h) => ({
              value: h.id,
              label: `${h.inventoryNumber} · ${enumLabel(HARDWARE_TYPE, h.type)} ${h.manufacturer} ${h.model}`,
            }))}
          />
        </Field>
        <Field label="Категория" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={enumOptions(TICKET_CATEGORY)} />
        </Field>
        <Field label="Приоритет" required>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={enumOptions(TICKET_PRIORITY)} />
        </Field>
        <Field label="Тема" required className="md:col-span-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Кратко: что случилось" maxLength={200} />
        </Field>
        <Field label="Описание проблемы" required className="md:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Когда возникла проблема, что вы уже пробовали сделать, текст ошибки…"
            rows={5}
          />
        </Field>
      </FormGrid>
    </Modal>
  );
}
