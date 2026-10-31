"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Briefcase, FileUp, Home, IdCard, Paperclip, Phone, Save, Trash2, UserRound } from "lucide-react";
import { DOCUMENT_TYPE, EMPLOYEE_STATUS, GENDER, enumOptions } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatSize, todayISO } from "@/lib/format";
import type { Address, Department, EmployeeDTO } from "@/lib/types";
import { useSession } from "@/components/session";
import { Button, Card, CardHeader, Checkbox, Field, FormGrid, Input, Select, useToast } from "@/components/ui";

const EMPTY_ADDRESS: Address = { region: "Гомельская область", city: "", street: "", house: "", apartment: "", postalCode: "" };

type FormState = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  position: string;
  departmentId: string;
  hireDate: string;
  status: string;
  email: string;
  phone: string;
  workPhone: string;
  registrationAddress: Address;
  residentialAddress: Address;
  sameAddress: boolean;
  passport: { series: string; number: string; personalNumber: string; issuedBy: string; issuedAt: string };
  bank: { bankName: string; bic: string; iban: string };
  emergencyContact: { name: string; relation: string; phone: string };
  education: string;
};

function fromEmployee(e?: EmployeeDTO): FormState {
  if (!e) {
    return {
      lastName: "",
      firstName: "",
      middleName: "",
      birthDate: "",
      gender: "male",
      position: "",
      departmentId: "",
      hireDate: todayISO(),
      status: "probation",
      email: "",
      phone: "+375 ",
      workPhone: "",
      registrationAddress: { ...EMPTY_ADDRESS },
      residentialAddress: { ...EMPTY_ADDRESS },
      sameAddress: true,
      passport: { series: "HB", number: "", personalNumber: "", issuedBy: "", issuedAt: "" },
      bank: { bankName: "ОАО «АСБ Беларусбанк»", bic: "AKBBBY2X", iban: "" },
      emergencyContact: { name: "", relation: "", phone: "" },
      education: "",
    };
  }
  return {
    lastName: e.lastName,
    firstName: e.firstName,
    middleName: e.middleName,
    birthDate: e.birthDate,
    gender: e.gender,
    position: e.position,
    departmentId: e.departmentId,
    hireDate: e.hireDate,
    status: e.status,
    email: e.email,
    phone: e.phone,
    workPhone: e.workPhone,
    registrationAddress: { ...e.registrationAddress },
    residentialAddress: { ...e.residentialAddress },
    sameAddress: JSON.stringify(e.registrationAddress) === JSON.stringify(e.residentialAddress),
    passport: { ...e.passport },
    bank: { ...e.bank },
    emergencyContact: { ...e.emergencyContact },
    education: e.education,
  };
}

const BANKS = [
  { name: "ОАО «АСБ Беларусбанк»", bic: "AKBBBY2X" },
  { name: "ОАО «Белагропромбанк»", bic: "BAPBBY2X" },
  { name: "ОАО «Приорбанк»", bic: "PJCBBY2X" },
  { name: "ОАО «БНБ-Банк»", bic: "BLNBBY2X" },
  { name: "ОАО «Белинвестбанк»", bic: "BLBBBY2X" },
];

function AddressFields({ value, onChange, disabled }: { value: Address; onChange: (a: Address) => void; disabled?: boolean }) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <FormGrid cols={3}>
      <Field label="Область">
        <Input value={value.region} onChange={set("region")} disabled={disabled} />
      </Field>
      <Field label="Населённый пункт" required>
        <Input value={value.city} onChange={set("city")} disabled={disabled} placeholder="г. Гомель" />
      </Field>
      <Field label="Почтовый индекс">
        <Input value={value.postalCode} onChange={set("postalCode")} disabled={disabled} placeholder="246000" />
      </Field>
      <Field label="Улица" required>
        <Input value={value.street} onChange={set("street")} disabled={disabled} />
      </Field>
      <Field label="Дом" required>
        <Input value={value.house} onChange={set("house")} disabled={disabled} />
      </Field>
      <Field label="Квартира">
        <Input value={value.apartment} onChange={set("apartment")} disabled={disabled} />
      </Field>
    </FormGrid>
  );
}

interface QueuedDoc {
  file: File;
  type: string;
  title: string;
}

export function EmployeeForm({ employee }: { employee?: EmployeeDTO }) {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const sensitive = session.permissions.includes("hr.employees.sensitive");
  const canUpload = session.permissions.includes("hr.documents.manage");
  const { data: departments } = useApi<Pick<Department, "id" | "name" | "parentId">[]>("/api/lookup/departments");
  const [form, setForm] = useState<FormState>(() => fromEmployee(employee));
  const [docs, setDocs] = useState<QueuedDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!employee;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await apiFetch<EmployeeDTO>(isEdit ? `/api/hr/employees/${employee.id}` : "/api/hr/employees", {
        method: isEdit ? "PATCH" : "POST",
        body: form,
      });
      for (const d of docs) {
        const fd = new FormData();
        fd.set("file", d.file);
        fd.set("type", d.type);
        fd.set("title", d.title);
        await apiFetch(`/api/hr/employees/${saved.id}/documents`, { formData: fd });
      }
      toast.success(isEdit ? "Изменения сохранены" : `Сотрудник ${saved.fullName} принят. Вы назначены его HR-менеджером`);
      router.push(`/hr/employees/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Основные сведения" icon={<UserRound className="h-4 w-4" />} />
        <div className="p-6">
          <FormGrid cols={3}>
            <Field label="Фамилия" required>
              <Input value={form.lastName} onChange={text("lastName")} />
            </Field>
            <Field label="Имя" required>
              <Input value={form.firstName} onChange={text("firstName")} />
            </Field>
            <Field label="Отчество">
              <Input value={form.middleName} onChange={text("middleName")} />
            </Field>
            <Field label="Дата рождения" required>
              <Input type="date" value={form.birthDate} onChange={text("birthDate")} />
            </Field>
            <Field label="Пол" required>
              <Select value={form.gender} onChange={text("gender")} options={enumOptions(GENDER)} />
            </Field>
            <Field label="Образование">
              <Input value={form.education} onChange={text("education")} placeholder="Высшее, ГГТУ им. П.О. Сухого" />
            </Field>
          </FormGrid>
        </div>
      </Card>

      <Card>
        <CardHeader title="Трудоустройство" icon={<Briefcase className="h-4 w-4" />} />
        <div className="p-6">
          <FormGrid>
            <Field label="Подразделение" required hint="Сотрудник не может быть без подразделения">
              <Select value={form.departmentId} onChange={text("departmentId")} placeholder="Выберите подразделение" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
            </Field>
            <Field label="Должность" required>
              <Input value={form.position} onChange={text("position")} placeholder="Инженер-технолог" />
            </Field>
            <Field label="Дата приёма" required>
              <Input type="date" value={form.hireDate} onChange={text("hireDate")} />
            </Field>
            <Field label="Статус" required>
              <Select value={form.status} onChange={text("status")} options={enumOptions(EMPLOYEE_STATUS)} />
            </Field>
          </FormGrid>
          {!isEdit && (
            <p className="mt-4 rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
              Вы ({session.employee.shortName}) будете автоматически назначены ответственным HR-менеджером сотрудника.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Контакты" icon={<Phone className="h-4 w-4" />} />
        <div className="p-6">
          <FormGrid cols={3}>
            <Field label="Мобильный телефон" required>
              <Input value={form.phone} onChange={text("phone")} placeholder="+375 29 123-45-67" />
            </Field>
            <Field label="Рабочий телефон">
              <Input value={form.workPhone} onChange={text("workPhone")} placeholder="+375 232 79-00-00" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={text("email")} placeholder="i.ivanov@belorusneft.by" />
            </Field>
            <Field label="Контакт для экстренной связи">
              <Input value={form.emergencyContact.name} onChange={(e) => set("emergencyContact", { ...form.emergencyContact, name: e.target.value })} placeholder="ФИО" />
            </Field>
            <Field label="Степень родства">
              <Input value={form.emergencyContact.relation} onChange={(e) => set("emergencyContact", { ...form.emergencyContact, relation: e.target.value })} />
            </Field>
            <Field label="Телефон контакта">
              <Input value={form.emergencyContact.phone} onChange={(e) => set("emergencyContact", { ...form.emergencyContact, phone: e.target.value })} />
            </Field>
          </FormGrid>
        </div>
      </Card>

      <Card>
        <CardHeader title="Адреса" icon={<Home className="h-4 w-4" />} />
        <div className="flex flex-col gap-6 p-6">
          <div>
            <div className="mb-3 text-sm font-bold text-fg">Адрес регистрации</div>
            <AddressFields value={form.registrationAddress} onChange={(a) => set("registrationAddress", a)} />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-4">
              <span className="text-sm font-bold text-fg">Адрес проживания</span>
              <Checkbox checked={form.sameAddress} onChange={(v) => set("sameAddress", v)} label="Совпадает с адресом регистрации" />
            </div>
            {!form.sameAddress && <AddressFields value={form.residentialAddress} onChange={(a) => set("residentialAddress", a)} />}
          </div>
        </div>
      </Card>

      {(sensitive || !isEdit) && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Паспортные данные" icon={<IdCard className="h-4 w-4" />} />
            <div className="p-6">
              <FormGrid>
                <Field label="Серия" required>
                  <Input value={form.passport.series} onChange={(e) => set("passport", { ...form.passport, series: e.target.value })} maxLength={4} />
                </Field>
                <Field label="Номер" required>
                  <Input value={form.passport.number} onChange={(e) => set("passport", { ...form.passport, number: e.target.value })} maxLength={10} />
                </Field>
                <Field label="Идентификационный номер" required className="md:col-span-2">
                  <Input
                    value={form.passport.personalNumber}
                    onChange={(e) => set("passport", { ...form.passport, personalNumber: e.target.value })}
                    maxLength={14}
                    placeholder="3010185A012PB7"
                    className="font-mono uppercase"
                  />
                </Field>
                <Field label="Кем выдан" required>
                  <Input value={form.passport.issuedBy} onChange={(e) => set("passport", { ...form.passport, issuedBy: e.target.value })} />
                </Field>
                <Field label="Дата выдачи" required>
                  <Input type="date" value={form.passport.issuedAt} onChange={(e) => set("passport", { ...form.passport, issuedAt: e.target.value })} />
                </Field>
              </FormGrid>
            </div>
          </Card>
          <Card>
            <CardHeader title="Банковские реквизиты" icon={<Banknote className="h-4 w-4" />} />
            <div className="p-6">
              <FormGrid>
                <Field label="Банк" required className="md:col-span-2">
                  <Select
                    value={form.bank.bankName}
                    onChange={(e) => {
                      const b = BANKS.find((x) => x.name === e.target.value);
                      set("bank", { ...form.bank, bankName: e.target.value, bic: b?.bic ?? form.bank.bic });
                    }}
                    options={BANKS.map((b) => ({ value: b.name, label: b.name }))}
                  />
                </Field>
                <Field label="БИК" required>
                  <Input value={form.bank.bic} onChange={(e) => set("bank", { ...form.bank, bic: e.target.value })} className="font-mono uppercase" />
                </Field>
                <Field label="Счёт (IBAN)" required hint="28 символов, начинается с BY">
                  <Input
                    value={form.bank.iban}
                    onChange={(e) => set("bank", { ...form.bank, iban: e.target.value })}
                    placeholder="BY20AKBB30140000000000000000"
                    className="font-mono uppercase"
                  />
                </Field>
              </FormGrid>
            </div>
          </Card>
        </div>
      )}

      {!isEdit && canUpload && (
        <Card>
          <CardHeader title="Документы" icon={<Paperclip className="h-4 w-4" />} />
          <div className="flex flex-col gap-3 p-6">
            {docs.map((d, i) => (
              <div key={i} className="grid items-end gap-3 md:grid-cols-[1fr_220px_1fr_40px]">
                <div className="truncate rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-fg">
                  {d.file.name} <span className="text-fg-subtle">· {formatSize(d.file.size)}</span>
                </div>
                <Select value={d.type} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} options={enumOptions(DOCUMENT_TYPE)} />
                <Input value={d.title} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Название" />
                <Button size="icon" variant="ghost" onClick={() => setDocs(docs.filter((_, j) => j !== i))} aria-label="Убрать">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-6 text-sm text-fg-muted hover:border-primary hover:text-primary">
              <FileUp className="h-4 w-4" /> Прикрепить файлы (паспорт, диплом, договор…) — PDF, JPG, PNG, DOCX до 10 МБ
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setDocs([...docs, ...files.map((file) => ({ file, type: "other", title: file.name.replace(/\.[^.]+$/, "") }))]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-line bg-bg/90 px-1 py-4 backdrop-blur">
        <Button onClick={() => router.back()}>Отмена</Button>
        <Button type="submit" variant="primary" loading={saving} icon={<Save className="h-4 w-4" />}>
          {isEdit ? "Сохранить изменения" : "Принять сотрудника"}
        </Button>
      </div>
    </form>
  );
}
