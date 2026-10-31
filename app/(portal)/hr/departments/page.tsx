"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Crown, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { apiFetch, useApi } from "@/lib/api-client";
import type { DepartmentDTO, EmployeeRef } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Avatar, Button, Card, Field, FormGrid, Input, Modal, PageHeader, Select, Spinner, Textarea, useToast } from "@/components/ui";

type Form = { name: string; shortName: string; code: string; parentId: string; headEmployeeId: string; city: string; description: string };
const EMPTY: Form = { name: "", shortName: "", code: "", parentId: "", headEmployeeId: "", city: "Гомель", description: "" };

export default function DepartmentsPage() {
  return (
    <Guard anyOf={["hr.departments.view"]}>
      <Departments />
    </Guard>
  );
}

function Departments() {
  const session = useSession();
  const toast = useToast();
  const canManage = session.permissions.includes("hr.departments.manage");
  const { data, loading, reload } = useApi<DepartmentDTO[]>("/api/hr/departments");
  const { data: employees } = useApi<EmployeeRef[]>(canManage ? "/api/lookup/employees" : null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<DepartmentDTO | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const children = useMemo(() => {
    const map = new Map<string | null, DepartmentDTO[]>();
    for (const d of data ?? []) map.set(d.parentId, [...(map.get(d.parentId) ?? []), d]);
    for (const list of map.values()) list.sort((a, b) => a.code.localeCompare(b.code, "ru", { numeric: true }));
    return map;
  }, [data]);

  const total = (id: string): number => (data ?? []).find((d) => d.id === id)!.employeeCount + (children.get(id) ?? []).reduce((s, c) => s + total(c.id), 0);

  const openForm = (d: DepartmentDTO | "new", parentId = "") => {
    setEditing(d);
    setForm(
      d === "new"
        ? { ...EMPTY, parentId }
        : { name: d.name, shortName: d.shortName, code: d.code, parentId: d.parentId ?? "", headEmployeeId: d.headEmployeeId, city: d.city, description: d.description },
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing === "new") await apiFetch("/api/hr/departments", { body: form });
      else await apiFetch(`/api/hr/departments/${(editing as DepartmentDTO).id}`, { method: "PATCH", body: form });
      toast.success("Подразделение сохранено");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DepartmentDTO) => {
    if (!window.confirm(`Удалить подразделение «${d.name}»?`)) return;
    try {
      await apiFetch(`/api/hr/departments/${d.id}`, { method: "DELETE" });
      toast.success("Подразделение удалено");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const renderNode = (d: DepartmentDTO, depth: number): React.ReactNode => {
    const kids = children.get(d.id) ?? [];
    const isCollapsed = collapsed.has(d.id);
    return (
      <div key={d.id}>
        <div className="group flex items-center gap-3 border-t border-line px-4 py-3.5 hover:bg-hover" style={{ paddingLeft: 16 + depth * 28 }}>
          <button
            className={`flex h-6 w-6 items-center justify-center rounded text-fg-subtle hover:bg-muted ${kids.length ? "" : "invisible"}`}
            onClick={() => {
              const next = new Set(collapsed);
              if (isCollapsed) next.delete(d.id);
              else next.add(d.id);
              setCollapsed(next);
            }}
            aria-label="Развернуть"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-fg">{d.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">{d.code}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-fg-subtle">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {d.city}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {d.employeeCount} / всего {total(d.id)}
              </span>
            </div>
          </div>
          <div className="hidden w-64 items-center gap-2.5 md:flex">
            {d.head && (
              <>
                <Avatar name={d.head.fullName} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 truncate text-sm font-semibold text-fg">
                    <Crown className="h-3 w-3 shrink-0 text-amber-500" /> {d.head.shortName}
                  </div>
                  <div className="truncate text-xs text-fg-subtle">{d.head.position}</div>
                </div>
              </>
            )}
          </div>
          {canManage && (
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="icon" variant="ghost" onClick={() => openForm("new", d.id)} title="Добавить дочернее">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openForm(d)} title="Редактировать">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(d)} title="Удалить">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {!isCollapsed && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Персонал", href: "/hr" }, { label: "Оргструктура" }]}
        title="Организационная структура"
        description="ГПО «Белоруснефть»: подразделения, руководители и численность. У каждого подразделения обязательно назначен руководитель."
        actions={
          canManage && (
            <Button variant="success" icon={<Plus className="h-4 w-4" />} onClick={() => openForm("new")}>
              Добавить подразделение
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          <span className="w-6" />
          <span className="flex-1">Подразделение</span>
          <span className="hidden w-64 md:block">Руководитель</span>
          {canManage && <span className="w-[116px]" />}
        </div>
        {loading && !data ? <Spinner /> : (children.get(null) ?? []).map((d) => renderNode(d, 0))}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Новое подразделение" : "Редактирование подразделения"}
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
          <Field label="Название" required className="md:col-span-2">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Краткое название">
            <Input value={form.shortName} onChange={set("shortName")} />
          </Field>
          <Field label="Код" required>
            <Input value={form.code} onChange={set("code")} placeholder="BN-1400" className="font-mono uppercase" />
          </Field>
          <Field label="Вышестоящее подразделение">
            <Select
              value={form.parentId}
              onChange={set("parentId")}
              placeholder="— Верхний уровень —"
              options={(data ?? []).filter((d) => editing === "new" || d.id !== (editing as DepartmentDTO)?.id).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Field>
          <Field label="Город" required>
            <Input value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Руководитель" required hint="Подразделение не может существовать без руководителя" className="md:col-span-2">
            <Select
              value={form.headEmployeeId}
              onChange={set("headEmployeeId")}
              placeholder="Выберите сотрудника"
              options={(employees ?? []).map((e) => ({ value: e.id, label: `${e.fullName} — ${e.position}` }))}
            />
          </Field>
          <Field label="Описание" className="md:col-span-2">
            <Textarea value={form.description} onChange={set("description")} rows={3} />
          </Field>
        </FormGrid>
      </Modal>
    </>
  );
}
