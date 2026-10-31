"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, PackageCheck, X } from "lucide-react";
import { PURCHASE_STATUS, type PurchaseStatus } from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import type { PurchaseDTO } from "@/lib/types";
import { Guard, useSession } from "@/components/session";
import { Button, CellTitle, DataTable, EnumBadge, Field, Modal, PageHeader, StatCard, Tabs, Textarea, useToast } from "@/components/ui";
import { CircleDollarSign, Clock, ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <Guard anyOf={["it.purchases.request", "it.purchases.approve"]}>
      <Purchases />
    </Guard>
  );
}

function Purchases() {
  const session = useSession();
  const toast = useToast();
  const { data, loading, reload } = useApi<PurchaseDTO[]>("/api/purchases");
  const [tab, setTab] = useState<PurchaseStatus | "all">("in_progress");
  const [rejecting, setRejecting] = useState<PurchaseDTO | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const canApprove = session.permissions.includes("it.purchases.approve");

  const rows = (data ?? []).filter((p) => tab === "all" || p.status === tab);
  const pending = (data ?? []).filter((p) => p.status === "in_progress");
  const approvedSum = (data ?? []).filter((p) => p.status === "approved" || p.status === "delivered").reduce((s, p) => s + p.total, 0);

  const act = async (p: PurchaseDTO, action: "approve" | "reject" | "deliver", c = "") => {
    setBusy(p.id + action);
    try {
      await apiFetch(`/api/purchases/${p.id}`, { method: "PATCH", body: { action, comment: c } });
      toast.success(`Закупка №${p.number}: статус обновлён`);
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
        breadcrumbs={[{ label: "ИТ-поддержка", href: "/it" }, { label: "Закупки" }]}
        title="Закупки комплектующих"
        description={canApprove ? "Согласуйте запросы инженеров на закупку комплектующих" : "Ваши и коллег запросы на закупку. Согласование выполняет начальник ИТ-поддержки"}
      />
      <div className="mb-7 grid gap-5 md:grid-cols-3">
        <StatCard label="На согласовании" value={pending.length} hint={formatMoney(pending.reduce((s, p) => s + p.total, 0))} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Всего запросов" value={data?.length ?? 0} icon={<ShoppingCart className="h-5 w-5" />} tone="blue" />
        <StatCard label="Одобрено на сумму" value={formatMoney(approvedSum)} icon={<CircleDollarSign className="h-5 w-5" />} tone="green" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ...(Object.keys(PURCHASE_STATUS) as PurchaseStatus[]).map((s) => ({
            value: s as PurchaseStatus | "all",
            label: PURCHASE_STATUS[s].label,
            count: (data ?? []).filter((p) => p.status === s).length,
          })),
          { value: "all", label: "Все", count: data?.length ?? 0 },
        ]}
      />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(p) => p.id}
        emptyTitle="Запросов нет"
        columns={[
          { key: "n", header: "№", render: (p) => <span className="font-mono text-xs font-semibold text-fg">№{p.number}</span> },
          {
            key: "ticket",
            header: "Заявка",
            render: (p) =>
              p.ticket ? (
                <Link href={`/it/tickets/${p.ticket.id}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                  <CellTitle sub={p.ticket.code}>{p.ticket.title}</CellTitle>
                </Link>
              ) : (
                "—"
              ),
          },
          {
            key: "items",
            header: "Позиции",
            className: "max-w-[260px]",
            render: (p) => (
              <div className="text-xs">
                {p.items.map((i, idx) => (
                  <div key={idx} className="truncate">
                    {i.name} × {i.quantity}
                  </div>
                ))}
              </div>
            ),
          },
          { key: "total", header: "Сумма", render: (p) => <span className="font-bold text-fg">{formatMoney(p.total)}</span> },
          { key: "by", header: "Инициатор", render: (p) => <CellTitle sub={formatDate(p.createdAt)}>{p.requestedBy?.shortName}</CellTitle> },
          { key: "status", header: "Статус", render: (p) => <EnumBadge map={PURCHASE_STATUS} value={p.status} dot /> },
          {
            key: "actions",
            header: "",
            render: (p) => (
              <div className="flex justify-end gap-1.5">
                {canApprove && p.status === "in_progress" && (
                  <>
                    <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} loading={busy === p.id + "approve"} onClick={() => act(p, "approve")}>
                      Одобрить
                    </Button>
                    <Button size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(p)}>
                      Отклонить
                    </Button>
                  </>
                )}
                {p.status === "approved" && (canApprove || p.requestedByUserId === session.userId) && (
                  <Button size="sm" icon={<PackageCheck className="h-3.5 w-3.5" />} loading={busy === p.id + "deliver"} onClick={() => act(p, "deliver")}>
                    Получено
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Отклонить закупку №${rejecting?.number}`}
        footer={
          <>
            <Button onClick={() => setRejecting(null)}>Отмена</Button>
            <Button variant="danger" loading={busy?.endsWith("reject")} onClick={() => rejecting && act(rejecting, "reject", comment)}>
              Отклонить
            </Button>
          </>
        }
      >
        <Field label="Причина отклонения" required>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
