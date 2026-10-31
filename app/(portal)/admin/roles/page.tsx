"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { apiFetch, useApi } from "@/lib/api-client";
import type { RoleDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Badge, Button, CellTitle, DataTable, Field, FormGrid, Input, Modal, PageHeader, Textarea, useToast } from "@/components/ui";

export default function RolesPage() {
  return (
    <Guard anyOf={["admin.roles.view"]}>
      <Roles />
    </Guard>
  );
}

function Roles() {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const canManage = session.permissions.includes("admin.roles.manage");
  const { data, loading } = useApi<RoleDTO[]>("/api/admin/roles");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      const role = await apiFetch<RoleDTO>("/api/admin/roles", { body: { ...form, permissions: [] } });
      toast.success("Роль создана — настройте её права");
      router.push(`/admin/roles/${role.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Администрирование", href: "/admin" }, { label: "Роли" }]}
        title="Роли"
        description="Роль — набор прав. Пользователь получает объединение прав всех назначенных ему ролей. Права определяют доступные приложения, пункты меню и действия."
        actions={
          canManage && (
            <Button variant="success" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Новая роль
            </Button>
          )
        }
      />
      <DataTable
        rows={data}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/roles/${r.id}`)}
        columns={[
          {
            key: "name",
            header: "Роль",
            render: (r) => (
              <div className="flex items-center gap-2">
                <CellTitle sub={r.description}>{r.name}</CellTitle>
                {r.isSystem && <Lock className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-label="Системная" />}
              </div>
            ),
          },
          { key: "code", header: "Код", render: (r) => <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-fg">{r.code}</span> },
          { key: "perms", header: "Прав", render: (r) => <Badge tone="blue">{r.permissions.length}</Badge> },
          { key: "users", header: "Пользователей", render: (r) => r.userCount },
          { key: "type", header: "Тип", render: (r) => (r.isSystem ? <Badge tone="gray">Системная</Badge> : <Badge tone="violet">Пользовательская</Badge>) },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая роль"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button variant="primary" loading={saving} onClick={create}>
              Создать и настроить права
            </Button>
          </>
        }
      >
        <FormGrid cols={1}>
          <Field label="Код (машинное имя)" required hint="Латиница в нижнем регистре и «_», например warehouse_manager">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Название" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Кладовщик" />
          </Field>
          <Field label="Описание">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </Field>
        </FormGrid>
      </Modal>
    </>
  );
}
