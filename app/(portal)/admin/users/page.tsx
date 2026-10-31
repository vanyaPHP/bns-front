"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { KeyRound, Lock, Plus, Search, Unlock, UserCog } from "lucide-react";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import type { EmployeeRef, RoleDTO, UserDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Avatar, Badge, Button, Checkbox, DataTable, Field, FormGrid, Input, Modal, PageHeader, Select, useToast } from "@/components/ui";

export default function UsersPage() {
  return (
    <Guard anyOf={["admin.users.view"]}>
      <Suspense>
        <UsersList />
      </Suspense>
    </Guard>
  );
}

function RolePicker({ roles, value, onChange }: { roles: RoleDTO[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {roles.map((r) => (
        <div key={r.id} className={`rounded-lg border px-3 py-2.5 ${value.includes(r.id) ? "border-primary bg-primary-soft" : "border-line"}`}>
          <Checkbox
            checked={value.includes(r.id)}
            onChange={(c) => onChange(c ? [...value, r.id] : value.filter((x) => x !== r.id))}
            label={
              <span>
                {r.name} <span className="font-mono text-[11px] text-fg-subtle">{r.code}</span>
              </span>
            }
            description={r.description}
          />
        </div>
      ))}
    </div>
  );
}

function UsersList() {
  const session = useSession();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const canManage = session.permissions.includes("admin.users.manage");
  const { data, loading, reload } = useApi<UserDTO[]>("/api/admin/users");
  const { data: roles } = useApi<RoleDTO[]>("/api/admin/roles");
  const { data: employees } = useApi<EmployeeRef[]>(canManage ? "/api/lookup/employees" : null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [creating, setCreating] = useState(params.get("create") === "1");
  const [editing, setEditing] = useState<UserDTO | null>(null);
  const [form, setForm] = useState({ employeeId: "", login: "", password: "", roleIds: [] as string[], isActive: true });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = (data ?? []).filter(
    (u) => (!roleFilter || u.roleIds.includes(roleFilter)) && `${u.login} ${u.employee?.fullName ?? ""} ${u.employee?.departmentName ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const withoutAccount = useMemo(() => {
    const taken = new Set((data ?? []).map((u) => u.employeeId));
    return (employees ?? []).filter((e) => !taken.has(e.id));
  }, [data, employees]);
  const employeeRole = roles?.find((r) => r.code === "employee");

  const openCreate = () => {
    setForm({ employeeId: "", login: "", password: "", roleIds: employeeRole ? [employeeRole.id] : [], isActive: true });
    setCreating(true);
  };
  const closeCreate = () => {
    setCreating(false);
    if (params.get("create")) router.replace("/admin/users");
  };

  const call = async (fn: () => Promise<unknown>, msg: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(msg);
      closeCreate();
      setEditing(null);
      setNewPassword("");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Администрирование", href: "/admin" }, { label: "Пользователи" }]}
        title="Пользователи"
        description="Учётные записи сотрудников и назначенные роли"
        actions={
          canManage && (
            <Button variant="success" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Новый пользователь
            </Button>
          )
        }
      />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(u) => u.id}
        onRowClick={canManage ? (u) => { setEditing(u); setForm({ ...form, roleIds: u.roleIds, isActive: u.isActive }); } : undefined}
        toolbar={
          <>
            <div className="w-full max-w-sm">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Логин, ФИО, подразделение…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-64">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder="Все роли" options={(roles ?? []).map((r) => ({ value: r.id, label: r.name }))} />
            </div>
          </>
        }
        columns={[
          {
            key: "user",
            header: "Пользователь",
            render: (u) => (
              <div className="flex items-center gap-3">
                <Avatar name={u.employee?.fullName ?? u.login} size="sm" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-fg">{u.employee?.fullName}</div>
                  <div className="truncate font-mono text-xs text-fg-subtle">{u.login}</div>
                </div>
              </div>
            ),
          },
          { key: "dept", header: "Подразделение", className: "max-w-[220px] truncate", render: (u) => u.employee?.departmentName },
          {
            key: "roles",
            header: "Роли",
            render: (u) => (
              <div className="flex max-w-[320px] flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r.id} tone={r.code === "sys_admin" ? "red" : r.code === "employee" ? "gray" : "blue"}>
                    {r.name}
                  </Badge>
                ))}
              </div>
            ),
          },
          { key: "status", header: "Статус", render: (u) => (u.isActive ? <Badge tone="green" dot>Активен</Badge> : <Badge tone="red" dot>Заблокирован</Badge>) },
          { key: "last", header: "Последний вход", render: (u) => <span className="whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</span> },
        ]}
      />

      <Modal
        open={creating}
        onClose={closeCreate}
        size="lg"
        title="Новая учётная запись"
        description="Учётная запись создаётся для сотрудника из кадрового реестра"
        footer={
          <>
            <Button onClick={closeCreate}>Отмена</Button>
            <Button variant="primary" loading={saving} onClick={() => call(() => apiFetch("/api/admin/users", { body: form }), "Учётная запись создана")}>
              Создать
            </Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Сотрудник" required className="md:col-span-2" hint={`Без учётной записи: ${withoutAccount.length}`}>
            <Select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              placeholder="Выберите сотрудника"
              options={withoutAccount.map((e) => ({ value: e.id, label: `${e.fullName} — ${e.departmentName}` }))}
            />
          </Field>
          <Field label="Логин" required>
            <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="i.ivanov" className="font-mono" />
          </Field>
          <Field label="Временный пароль" required hint="Не менее 6 символов">
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Роли" required group className="md:col-span-2">
            <RolePicker roles={roles ?? []} value={form.roleIds} onChange={(roleIds) => setForm({ ...form, roleIds })} />
          </Field>
        </FormGrid>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> {editing?.employee?.fullName}
          </span>
        }
        description={<span className="font-mono">{editing?.login}</span>}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Отмена</Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={() =>
                call(() => apiFetch(`/api/admin/users/${editing!.id}`, { method: "PATCH", body: { action: "update", roleIds: form.roleIds, isActive: form.isActive } }), "Изменения сохранены")
              }
            >
              Сохранить
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <Field label="Роли" group>
            <RolePicker roles={roles ?? []} value={form.roleIds} onChange={(roleIds) => setForm({ ...form, roleIds })} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-fg">{form.isActive ? "Учётная запись активна" : "Учётная запись заблокирована"}</div>
              <div className="text-xs text-fg-subtle">Блокировка завершает все активные сеансы пользователя</div>
            </div>
            <Button size="sm" variant={form.isActive ? "danger" : "success"} icon={form.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} onClick={() => setForm({ ...form, isActive: !form.isActive })}>
              {form.isActive ? "Заблокировать" : "Разблокировать"}
            </Button>
          </div>
          <div className="flex items-end gap-2 rounded-lg border border-line px-4 py-3">
            <Field label="Новый пароль" className="flex-1">
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" placeholder="не менее 6 символов" />
            </Field>
            <Button
              icon={<KeyRound className="h-4 w-4" />}
              disabled={!newPassword}
              loading={saving}
              onClick={() => call(() => apiFetch(`/api/admin/users/${editing!.id}`, { method: "PATCH", body: { action: "reset_password", password: newPassword } }), "Пароль изменён")}
            >
              Сбросить пароль
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
