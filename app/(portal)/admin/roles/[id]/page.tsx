"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Lock, Save, Trash2 } from "lucide-react";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { apiFetch, useApi } from "@/lib/api-client";
import type { RoleDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Button, Card, CardHeader, Checkbox, ErrorBox, Field, FormGrid, Input, PageHeader, Spinner, Textarea, useToast } from "@/components/ui";

export default function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Guard anyOf={["admin.roles.view"]}>
      <RoleEditor id={id} />
    </Guard>
  );
}

function RoleEditor({ id }: { id: string }) {
  const { data, error } = useApi<RoleDTO>(`/api/admin/roles/${id}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner />;
  return <RoleForm role={data} />;
}

function RoleForm({ role }: { role: RoleDTO }) {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const canManage = session.permissions.includes("admin.roles.manage");
  const [form, setForm] = useState({ code: role.code, name: role.name, description: role.description });
  const [perms, setPerms] = useState<Set<string>>(new Set(role.permissions));
  const [saving, setSaving] = useState(false);

  const toggle = (key: string, on: boolean) => {
    const next = new Set(perms);
    if (on) next.add(key);
    else next.delete(key);
    setPerms(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/roles/${role.id}`, { method: "PATCH", body: { ...form, permissions: [...perms] } });
      toast.success("Роль сохранена. Изменения применятся при следующей загрузке страницы пользователями");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить роль «${role.name}»?`)) return;
    try {
      await apiFetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      toast.success("Роль удалена");
      router.push("/admin/roles");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Администрирование", href: "/admin" },
          { label: "Роли", href: "/admin/roles" },
          { label: role.name },
        ]}
        title={
          <span className="flex items-center gap-3">
            {role.name}
            {role.isSystem && <Lock className="h-5 w-5 text-fg-subtle" />}
          </span>
        }
        description={`${role.userCount} пользователей · ${perms.size} прав`}
        actions={
          canManage && (
            <>
              {!role.isSystem && (
                <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                  Удалить
                </Button>
              )}
              <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
                Сохранить
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {PERMISSION_GROUPS.map((g) => {
            const all = g.permissions.every((p) => perms.has(p.key));
            return (
              <Card key={g.app}>
                <CardHeader
                  title={g.label}
                  badge={<span className="text-xs text-fg-subtle">{g.permissions.filter((p) => perms.has(p.key)).length} / {g.permissions.length}</span>}
                  actions={
                    canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = new Set(perms);
                          g.permissions.forEach((p) => (all ? next.delete(p.key) : next.add(p.key)));
                          setPerms(next);
                        }}
                      >
                        {all ? "Снять все" : "Выбрать все"}
                      </Button>
                    )
                  }
                />
                <div className="grid gap-x-6 gap-y-4 p-6 md:grid-cols-2">
                  {g.permissions.map((p) => (
                    <Checkbox
                      key={p.key}
                      checked={perms.has(p.key)}
                      disabled={!canManage}
                      onChange={(v) => toggle(p.key, v)}
                      label={
                        <span>
                          {p.label} <span className="ml-1 font-mono text-[10px] text-fg-subtle">{p.key}</span>
                        </span>
                      }
                      description={p.description}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
        <div>
          <Card className="sticky top-0">
            <CardHeader title="Свойства роли" />
            <div className="p-6">
              <FormGrid cols={1}>
                <Field label="Код (машинное имя)" required hint={role.isSystem ? "Код системной роли неизменяем" : undefined}>
                  <Input value={form.code} disabled={role.isSystem || !canManage} onChange={(e) => setForm({ ...form, code: e.target.value })} className="font-mono" />
                </Field>
                <Field label="Название" required>
                  <Input value={form.name} disabled={!canManage} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Описание">
                  <Textarea value={form.description} disabled={!canManage} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </Field>
              </FormGrid>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
