"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Copy, Crown, Download, Eye, FileUp, Pencil, Trash2 } from "lucide-react";
import { DOCUMENT_TYPE, EMPLOYEE_STATUS, GENDER, HARDWARE_STATUS, HARDWARE_TYPE, enumLabel, enumOptions } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDate, formatDateTime, formatSize } from "@/lib/format";
import type { Address, DocumentDTO, EmployeeDTO, HardwareDTO, LeaveBalance, LeaveDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  DataTable,
  DescriptionList,
  EnumBadge,
  ErrorBox,
  Field,
  FormGrid,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  useToast,
} from "@/components/ui";
import { LeaveTable } from "@/components/vacation/leave-table";

type Tab = "general" | "contacts" | "personal" | "documents" | "hardware" | "leave" | "history";

const addr = (a: Address) => [a.postalCode, a.region, a.city, a.street, a.house && `д. ${a.house}`, a.apartment && `кв. ${a.apartment}`].filter(Boolean).join(", ");

export default function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Guard anyOf={["hr.employees.view"]}>
      <EmployeeProfile id={id} />
    </Guard>
  );
}

function EmployeeProfile({ id }: { id: string }) {
  const session = useSession();
  const can = (p: string) => session.permissions.includes(p);
  const [tab, setTab] = useState<Tab>("general");
  const { data: e, error } = useApi<EmployeeDTO>(`/api/hr/employees/${id}`);

  if (error) return <ErrorBox message={error} />;
  if (!e) return <Spinner />;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Персонал", href: "/hr" },
          { label: "Сотрудники", href: "/hr/employees" },
          { label: e.fullName },
        ]}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={e.fullName} size="lg" />
            <span>
              {e.fullName}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-fg-muted">
                {e.position} · {e.departmentName}
                <EnumBadge map={EMPLOYEE_STATUS} value={e.status} dot />
                {e.headOf.map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Crown className="h-3 w-3" /> Руководитель: {d.name}
                  </span>
                ))}
              </span>
            </span>
          </span>
        }
        actions={
          can("hr.employees.edit") && (
            <LinkButton href={`/hr/employees/${id}/edit`} icon={<Pencil className="h-4 w-4" />}>
              Редактировать
            </LinkButton>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "general", label: "Общие сведения" },
          { value: "contacts", label: "Контакты и адреса" },
          { value: "personal", label: "Паспорт и банк" },
          { value: "documents", label: "Документы" },
          { value: "hardware", label: "Оборудование" },
          { value: "leave", label: "Отпуска" },
          ...(can("hr.audit.view") ? [{ value: "history" as Tab, label: "История изменений" }] : []),
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {tab === "general" && (
            <Card>
              <CardHeader title="Общие сведения" />
              <div className="p-6">
                <DescriptionList
                  items={[
                    { label: "Фамилия, имя, отчество", value: e.fullName },
                    { label: "Табельный номер", value: e.personnelNumber },
                    { label: "Дата рождения", value: formatDate(e.birthDate) },
                    { label: "Пол", value: enumLabel(GENDER, e.gender) },
                    { label: "Подразделение", value: e.departmentName },
                    { label: "Должность", value: e.position },
                    { label: "Дата приёма", value: formatDate(e.hireDate) },
                    { label: "Статус", value: enumLabel(EMPLOYEE_STATUS, e.status) },
                    { label: "Образование", value: e.education, span: true },
                  ]}
                />
              </div>
            </Card>
          )}
          {tab === "contacts" && (
            <Card>
              <CardHeader title="Контакты и адреса" />
              <div className="p-6">
                <DescriptionList
                  items={[
                    { label: "Мобильный телефон", value: e.phone },
                    { label: "Рабочий телефон", value: e.workPhone },
                    { label: "Email", value: e.email },
                    { label: "Экстренный контакт", value: [e.emergencyContact.name, e.emergencyContact.relation, e.emergencyContact.phone].filter(Boolean).join(" · ") },
                    { label: "Адрес регистрации", value: addr(e.registrationAddress), span: true },
                    { label: "Адрес проживания", value: addr(e.residentialAddress), span: true },
                  ]}
                />
              </div>
            </Card>
          )}
          {tab === "personal" && (
            <Card>
              <CardHeader title="Паспорт и банковские реквизиты" badge={!can("hr.employees.sensitive") && <span className="text-xs text-fg-subtle">данные скрыты — нет прав</span>} />
              <div className="p-6">
                <DescriptionList
                  items={[
                    { label: "Серия и номер паспорта", value: `${e.passport.series} ${e.passport.number}` },
                    { label: "Идентификационный номер", value: <span className="font-mono">{e.passport.personalNumber}</span> },
                    { label: "Кем выдан", value: e.passport.issuedBy },
                    { label: "Дата выдачи", value: formatDate(e.passport.issuedAt) },
                    { label: "Банк", value: e.bank.bankName },
                    { label: "БИК", value: <span className="font-mono">{e.bank.bic}</span> },
                    { label: "Счёт (IBAN)", value: <span className="font-mono">{e.bank.iban}</span>, span: true },
                  ]}
                />
              </div>
            </Card>
          )}
          {tab === "documents" && <Documents employeeId={id} />}
          {tab === "hardware" && <EmployeeHardware employeeId={id} />}
          {tab === "leave" && <EmployeeLeave employeeId={id} />}
          {tab === "history" && <EntityHistory employeeId={id} />}
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="border-b border-line pb-3 text-lg font-bold text-fg">Карточка сотрудника</h3>
            <div className="mt-4 text-sm text-fg-muted">Идентификатор</div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-fg-muted">{e.id}</span>
              <button onClick={() => navigator.clipboard.writeText(e.id)} className="text-fg-subtle hover:text-fg" aria-label="Скопировать">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 text-sm text-fg-muted">Ответственный HR-менеджер</div>
            <div className="mt-1.5 text-[15px] text-fg">{e.hrManager?.fullName ?? "—"}</div>
            <div className="mt-5 text-sm text-fg-muted">Создана</div>
            <div className="mt-1.5 text-[15px] text-fg underline decoration-dotted underline-offset-4">{formatDateTime(e.createdAt)}</div>
            <div className="mt-5 text-sm text-fg-muted">Обновлена</div>
            <div className="mt-1.5 text-[15px] text-fg underline decoration-dotted underline-offset-4">{formatDateTime(e.updatedAt)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function EntityHistory({ employeeId }: { employeeId: string }) {
  const { data, loading } = useApi<{ id: string; createdAt: string; summary: string; user: { name: string } | null }[]>(
    `/api/audit?app=hr&entityId=${employeeId}`,
  );
  return (
    <DataTable
      rows={data}
      loading={loading}
      rowKey={(l) => l.id}
      emptyTitle="Изменений не зафиксировано"
      columns={[
        { key: "d", header: "Дата", render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
        { key: "u", header: "Пользователь", render: (l) => l.user?.name ?? "Система" },
        { key: "s", header: "Действие", render: (l) => <span className="text-fg">{l.summary}</span> },
      ]}
    />
  );
}

function Documents({ employeeId }: { employeeId: string }) {
  const session = useSession();
  const toast = useToast();
  const canManage = session.permissions.includes("hr.documents.manage");
  const { data, loading, reload } = useApi<DocumentDTO[]>(`/api/hr/employees/${employeeId}/documents`);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("passport");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const upload = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("type", type);
      fd.set("title", title || file.name);
      await apiFetch(`/api/hr/employees/${employeeId}/documents`, { formData: fd });
      toast.success("Документ загружен");
      setOpen(false);
      setFile(null);
      setTitle("");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DocumentDTO) => {
    if (!window.confirm(`Удалить документ «${d.title}»?`)) return;
    try {
      await apiFetch(`/api/hr/documents/${d.id}`, { method: "DELETE" });
      toast.success("Документ удалён");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <DataTable
        rows={data}
        loading={loading}
        rowKey={(d) => d.id}
        emptyTitle="Документы не загружены"
        emptyDescription="Загрузите сканы паспорта, диплома, трудового договора и другие документы"
        toolbar={
          <>
            <span className="text-lg font-bold text-fg">Документы ({data?.length ?? 0})</span>
            {canManage && (
              <Button className="ml-auto" variant="primary" size="sm" icon={<FileUp className="h-4 w-4" />} onClick={() => setOpen(true)}>
                Загрузить документ
              </Button>
            )}
          </>
        }
        columns={[
          { key: "title", header: "Документ", render: (d) => <div><div className="font-semibold text-fg">{d.title}</div><div className="text-xs text-fg-subtle">{d.fileName} · {formatSize(d.size)}</div></div> },
          { key: "type", header: "Тип", render: (d) => <EnumBadge map={DOCUMENT_TYPE} value={d.type} /> },
          { key: "by", header: "Загрузил", render: (d) => d.uploadedBy },
          { key: "at", header: "Дата", render: (d) => formatDateTime(d.createdAt) },
          {
            key: "a",
            header: "",
            render: (d) => (
              <div className="flex justify-end gap-1">
                <a href={`/api/hr/documents/${d.id}?inline=1`} target="_blank" rel="noreferrer" className="rounded-md p-2 text-fg-subtle hover:bg-hover hover:text-fg" title="Открыть">
                  <Eye className="h-4 w-4" />
                </a>
                <a href={`/api/hr/documents/${d.id}`} className="rounded-md p-2 text-fg-subtle hover:bg-hover hover:text-fg" title="Скачать">
                  <Download className="h-4 w-4" />
                </a>
                {canManage && (
                  <button onClick={() => remove(d)} className="rounded-md p-2 text-fg-subtle hover:bg-hover hover:text-red-500" title="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Загрузка документа"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button variant="primary" loading={saving} disabled={!file} onClick={upload}>
              Загрузить
            </Button>
          </>
        }
      >
        <FormGrid cols={1}>
          <Field label="Файл" required hint="PDF, JPG, PNG, DOC(X), XLS(X), TXT — до 10 МБ">
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt" className="py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Тип документа" required>
            <Select value={type} onChange={(e) => setType(e.target.value)} options={enumOptions(DOCUMENT_TYPE)} />
          </Field>
          <Field label="Название">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name ?? "Например, «Паспорт, стр. 31–33»"} />
          </Field>
        </FormGrid>
      </Modal>
    </>
  );
}

function EmployeeHardware({ employeeId }: { employeeId: string }) {
  const { data, loading } = useApi<HardwareDTO[]>(`/api/my/hardware?employeeId=${employeeId}`);
  return (
    <DataTable
      rows={data}
      loading={loading}
      rowKey={(h) => h.id}
      emptyTitle="Оборудование не закреплено"
      emptyDescription="Выдачу оборудования выполняет начальник ИТ-поддержки в приложении «ИТ-поддержка»"
      columns={[
        { key: "inv", header: "Инв. номер", render: (h) => <span className="font-mono text-xs font-semibold text-fg">{h.inventoryNumber}</span> },
        { key: "type", header: "Тип", render: (h) => enumLabel(HARDWARE_TYPE, h.type) },
        { key: "model", header: "Модель", render: (h) => `${h.manufacturer} ${h.model}` },
        { key: "status", header: "Статус", render: (h) => <EnumBadge map={HARDWARE_STATUS} value={h.status} dot /> },
        { key: "since", header: "Выдано", render: (h) => formatDate(h.assignedAt) },
      ]}
    />
  );
}

function EmployeeLeave({ employeeId }: { employeeId: string }) {
  const { data, loading } = useApi<LeaveDTO[]>(`/api/leave?scope=employee&employeeId=${employeeId}`);
  const { data: balance } = useApi<LeaveBalance>(`/api/leave/balance?employeeId=${employeeId}`);
  return (
    <div className="flex flex-col gap-4">
      {balance && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Положено в " + balance.year, balance.entitlement],
            ["Использовано", balance.used],
            ["На согласовании", balance.pending],
            ["Остаток", balance.remaining],
          ].map(([l, v]) => (
            <Card key={String(l)} className="px-5 py-4">
              <div className="text-xs text-fg-muted">{l}</div>
              <div className="text-2xl font-bold text-fg">{v} дн.</div>
            </Card>
          ))}
        </div>
      )}
      <LeaveTable rows={data} loading={loading} />
      <p className="text-xs text-fg-subtle">
        Заявления подаются сотрудником в приложении <Link href="/vacation" className="text-primary">«Отпуска»</Link>.
      </p>
    </div>
  );
}
