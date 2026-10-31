"use client";

import { useMemo, useState } from "react";
import { Archive, HardDrive, Pencil, Plus, Search, UserCheck, UserMinus, Wrench } from "lucide-react";
import { HARDWARE_STATUS, HARDWARE_TYPE, enumOptions, type HardwareStatus } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { EmployeeRef, HardwareDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import {
  Button,
  CellTitle,
  DataTable,
  EnumBadge,
  Field,
  FormGrid,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  Textarea,
  useToast,
} from "@/components/ui";

type Form = {
  inventoryNumber: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: string;
  purchaseDate: string;
  warrantyUntil: string;
  notes: string;
  employeeId: string;
};

const EMPTY: Form = {
  inventoryNumber: "",
  type: "laptop",
  manufacturer: "",
  model: "",
  serialNumber: "",
  status: "in_stock",
  purchaseDate: "",
  warrantyUntil: "",
  notes: "",
  employeeId: "",
};

export default function HardwarePage() {
  return (
    <Guard anyOf={["it.hardware.view", "it.hardware.manage"]}>
      <HardwareRegistry />
    </Guard>
  );
}

function HardwareRegistry() {
  const session = useSession();
  const toast = useToast();
  const canManage = session.permissions.includes("it.hardware.manage");
  const { data, loading, reload } = useApi<HardwareDTO[]>("/api/hardware");
  const { data: employees } = useApi<EmployeeRef[]>(canManage ? "/api/lookup/employees" : null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<HardwareDTO | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [assigning, setAssigning] = useState<HardwareDTO | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [unassigning, setUnassigning] = useState<HardwareDTO | null>(null);
  const [returnStatus, setReturnStatus] = useState<HardwareStatus>("in_stock");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (h) =>
          (!type || h.type === type) &&
          (!status || h.status === status) &&
          `${h.inventoryNumber} ${h.manufacturer} ${h.model} ${h.serialNumber} ${h.employee?.fullName ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q, type, status],
  );
  const employeeOptions = (employees ?? []).map((e) => ({ value: e.id, label: `${e.fullName} — ${e.departmentName}` }));
  const count = (s: HardwareStatus) => (data ?? []).filter((h) => h.status === s).length;

  const openEdit = (h: HardwareDTO | "new") => {
    setEditing(h);
    setForm(
      h === "new"
        ? EMPTY
        : {
            inventoryNumber: h.inventoryNumber,
            type: h.type,
            manufacturer: h.manufacturer,
            model: h.model,
            serialNumber: h.serialNumber,
            status: h.status,
            purchaseDate: h.purchaseDate,
            warrantyUntil: h.warrantyUntil,
            notes: h.notes,
            employeeId: h.employeeId ?? "",
          },
    );
  };

  const call = async (fn: () => Promise<unknown>, msg: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(msg);
      setEditing(null);
      setAssigning(null);
      setUnassigning(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = () =>
    call(
      () =>
        editing === "new"
          ? apiFetch("/api/hardware", { body: form })
          : apiFetch(`/api/hardware/${(editing as HardwareDTO).id}`, { method: "PATCH", body: { action: "update", ...form } }),
      editing === "new" ? "Оборудование добавлено" : "Изменения сохранены",
    );

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "ИТ-поддержка", href: "/it" }, { label: "Оборудование" }]}
        title="Реестр оборудования"
        description="Учёт техники, выдача сотрудникам и изъятие. Привязка оборудования используется при создании заявок."
        actions={
          canManage && (
            <Button variant="success" icon={<Plus className="h-4 w-4" />} onClick={() => openEdit("new")}>
              Добавить оборудование
            </Button>
          )
        }
      />
      <div className="mb-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Всего единиц" value={data?.length ?? 0} icon={<HardDrive className="h-5 w-5" />} tone="blue" />
        <StatCard label="Выдано" value={count("assigned")} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <StatCard label="На складе" value={count("in_stock")} icon={<Archive className="h-5 w-5" />} tone="gray" />
        <StatCard label="В ремонте" value={count("repair")} icon={<Wrench className="h-5 w-5" />} tone="amber" />
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(h) => h.id}
        emptyTitle="Оборудование не найдено"
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Инв. номер, модель, сотрудник…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-48">
              <Select value={type} onChange={(e) => setType(e.target.value)} placeholder="Все типы" options={enumOptions(HARDWARE_TYPE)} />
            </div>
            <div className="w-44">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Все статусы" options={enumOptions(HARDWARE_STATUS)} />
            </div>
          </>
        }
        columns={[
          { key: "inv", header: "Инв. номер", render: (h) => <span className="font-mono text-xs font-semibold text-fg">{h.inventoryNumber}</span> },
          { key: "model", header: "Модель", render: (h) => <CellTitle sub={h.serialNumber}>{`${h.manufacturer} ${h.model}`}</CellTitle> },
          { key: "type", header: "Тип", render: (h) => <EnumBadge map={HARDWARE_TYPE} value={h.type} /> },
          { key: "status", header: "Статус", render: (h) => <EnumBadge map={HARDWARE_STATUS} value={h.status} dot /> },
          {
            key: "employee",
            header: "Сотрудник",
            render: (h) => (h.employee ? <CellTitle sub={h.employee.departmentName}>{h.employee.shortName}</CellTitle> : <span className="text-fg-subtle">—</span>),
          },
          { key: "warranty", header: "Гарантия до", render: (h) => formatDate(h.warrantyUntil) },
          {
            key: "actions",
            header: "",
            render: (h) =>
              canManage && (
                <div className="flex justify-end gap-1.5">
                  {h.employeeId ? (
                    <Button size="sm" icon={<UserMinus className="h-3.5 w-3.5" />} onClick={() => { setUnassigning(h); setReturnStatus("in_stock"); }}>
                      Изъять
                    </Button>
                  ) : (
                    h.status !== "written_off" && (
                      <Button size="sm" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => { setAssigning(h); setAssignTo(""); }}>
                        Выдать
                      </Button>
                    )
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(h)} aria-label="Редактировать">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Новое оборудование" : "Редактирование оборудования"}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Отмена</Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Сохранить
            </Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Инвентарный номер" required>
            <Input value={form.inventoryNumber} onChange={set("inventoryNumber")} placeholder="INV-10500" />
          </Field>
          <Field label="Тип" required>
            <Select value={form.type} onChange={set("type")} options={enumOptions(HARDWARE_TYPE)} />
          </Field>
          <Field label="Производитель" required>
            <Input value={form.manufacturer} onChange={set("manufacturer")} />
          </Field>
          <Field label="Модель" required>
            <Input value={form.model} onChange={set("model")} />
          </Field>
          <Field label="Серийный номер">
            <Input value={form.serialNumber} onChange={set("serialNumber")} />
          </Field>
          {editing === "new" ? (
            <Field label="Выдать сотруднику" hint="Можно выдать позже">
              <Select value={form.employeeId} onChange={set("employeeId")} placeholder="— На склад —" options={employeeOptions} />
            </Field>
          ) : (
            <Field label="Статус" hint={form.employeeId ? "Статус выданного оборудования меняется через изъятие" : undefined}>
              <Select
                value={form.status}
                onChange={set("status")}
                disabled={!!form.employeeId}
                options={enumOptions(HARDWARE_STATUS).filter((o) => o.value !== "assigned" || form.employeeId)}
              />
            </Field>
          )}
          <Field label="Дата покупки">
            <Input type="date" value={form.purchaseDate} onChange={set("purchaseDate")} />
          </Field>
          <Field label="Гарантия до">
            <Input type="date" value={form.warrantyUntil} onChange={set("warrantyUntil")} />
          </Field>
          <Field label="Примечание" className="md:col-span-2">
            <Textarea value={form.notes} onChange={set("notes")} rows={3} />
          </Field>
        </FormGrid>
      </Modal>

      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={`Выдача ${assigning?.inventoryNumber}`}
        description={`${assigning?.manufacturer} ${assigning?.model}`}
        footer={
          <>
            <Button onClick={() => setAssigning(null)}>Отмена</Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={!assignTo}
              onClick={() => call(() => apiFetch(`/api/hardware/${assigning!.id}`, { method: "PATCH", body: { action: "assign", employeeId: assignTo } }), "Оборудование выдано")}
            >
              Выдать
            </Button>
          </>
        }
      >
        <Field label="Сотрудник" required>
          <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder="Выберите сотрудника" options={employeeOptions} />
        </Field>
      </Modal>

      <Modal
        open={!!unassigning}
        onClose={() => setUnassigning(null)}
        title={`Изъятие ${unassigning?.inventoryNumber}`}
        description={`У сотрудника ${unassigning?.employee?.fullName}`}
        footer={
          <>
            <Button onClick={() => setUnassigning(null)}>Отмена</Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => call(() => apiFetch(`/api/hardware/${unassigning!.id}`, { method: "PATCH", body: { action: "unassign", status: returnStatus } }), "Оборудование изъято")}
            >
              Изъять
            </Button>
          </>
        }
      >
        <Field label="Куда передать">
          <Select
            value={returnStatus}
            onChange={(e) => setReturnStatus(e.target.value as HardwareStatus)}
            options={enumOptions(HARDWARE_STATUS).filter((o) => o.value !== "assigned")}
          />
        </Field>
      </Modal>
    </>
  );
}
