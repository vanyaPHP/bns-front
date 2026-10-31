"use client";

import { useState } from "react";
import {
  Ban,
  CheckCheck,
  CircleCheck,
  HardDrive,
  Hand,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShoppingCart,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  HARDWARE_TYPE,
  PURCHASE_STATUS,
  TICKET_CATEGORY,
  TICKET_PRIORITY,
  TICKET_STATUS,
  enumLabel,
  enumOptions,
} from "@/lib/enums";
import { apiFetch, useApi } from "@/lib/api-client";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { EmployeeRef, TicketAction, TicketView } from "@/lib/types";
import { useSession } from "@/components/session";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  EnumBadge,
  ErrorBox,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  useToast,
} from "@/components/ui";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="mb-1 text-xs text-fg-subtle">{label}</div>
      <div className="text-sm text-fg">{children}</div>
    </div>
  );
}

function PersonLine({ person }: { person: EmployeeRef | null }) {
  if (!person) return <span className="text-fg-subtle">Не назначен</span>;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={person.fullName} size="sm" />
      <div className="min-w-0">
        <div className="truncate font-semibold">{person.shortName}</div>
        <div className="truncate text-xs text-fg-subtle">{person.position}</div>
      </div>
    </div>
  );
}

export function TicketDetail({ id, breadcrumbs }: { id: string; breadcrumbs: { label: string; href?: string }[] }) {
  const session = useSession();
  const toast = useToast();
  const { data, error, loading, mutate } = useApi<TicketView>(`/api/tickets/${id}`);
  const { data: engineers } = useApi<EmployeeRef[]>(data?.actions.includes("assign") ? "/api/lookup/engineers" : null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "resolve" | "return" | "cancel" | "purchase">(null);
  const [dialogText, setDialogText] = useState("");

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox message={error} />;
  if (!data) return null;
  const { ticket, comments, purchases, actions } = data;
  const has = (a: TicketAction) => actions.includes(a);

  const run = async (action: TicketAction, extra: Record<string, unknown> = {}, success = "Заявка обновлена") => {
    setBusy(action);
    try {
      const view = await apiFetch<TicketView>(`/api/tickets/${id}`, { method: "PATCH", body: { action, ...extra } });
      mutate(() => view);
      toast.success(success);
      setDialog(null);
      setDialogText("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const reload = async () => {
    const view = await apiFetch<TicketView>(`/api/tickets/${id}`);
    mutate(() => view);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy("comment");
    try {
      await apiFetch(`/api/tickets/${id}/comments`, { body: { text: comment } });
      setComment("");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const purchaseAction = async (purchaseId: string, action: "approve" | "reject" | "deliver") => {
    let commentText = "";
    if (action === "reject") {
      commentText = window.prompt("Причина отклонения") ?? "";
      if (!commentText) return;
    }
    setBusy(purchaseId);
    try {
      await apiFetch(`/api/purchases/${purchaseId}`, { method: "PATCH", body: { action, comment: commentText } });
      toast.success("Статус закупки обновлён");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const canApprove = session.permissions.includes("it.purchases.approve");

  return (
    <>
      <PageHeader
        breadcrumbs={[...breadcrumbs, { label: ticket.code }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl text-fg-subtle">{ticket.code}</span>
            {ticket.title}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <EnumBadge map={TICKET_STATUS} value={ticket.status} dot />
            <EnumBadge map={TICKET_PRIORITY} value={ticket.priority} />
            <Badge>{enumLabel(TICKET_CATEGORY, ticket.category)}</Badge>
          </span>
        }
        actions={
          <>
            {has("take") && (
              <Button variant="primary" icon={<Hand className="h-4 w-4" />} loading={busy === "take"} onClick={() => run("take", {}, "Заявка взята в работу")}>
                Взять в работу
              </Button>
            )}
            {has("resume") && (
              <Button icon={<Play className="h-4 w-4" />} loading={busy === "resume"} onClick={() => run("resume")}>
                Возобновить работы
              </Button>
            )}
            {has("request_purchase") && (
              <Button icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setDialog("purchase")}>
                Запросить закупку
              </Button>
            )}
            {has("resolve") && (
              <Button variant="success" icon={<CircleCheck className="h-4 w-4" />} onClick={() => setDialog("resolve")}>
                Работы выполнены
              </Button>
            )}
            {has("verify") && (
              <Button variant="success" icon={<CheckCheck className="h-4 w-4" />} loading={busy === "verify"} onClick={() => run("verify", {}, "Заявка закрыта")}>
                Подтвердить и закрыть
              </Button>
            )}
            {has("return") && (
              <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setDialog("return")}>
                Вернуть на доработку
              </Button>
            )}
            {has("cancel") && (
              <Button variant="ghost" icon={<Ban className="h-4 w-4" />} onClick={() => setDialog("cancel")}>
                Отменить
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Описание проблемы" icon={<Wrench className="h-4 w-4" />} />
            <div className="px-6 py-5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg-muted">{ticket.description}</p>
              {ticket.hardware && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-muted/50 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <HardDrive className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-fg">
                      {enumLabel(HARDWARE_TYPE, ticket.hardware.type)} {ticket.hardware.manufacturer} {ticket.hardware.model}
                    </div>
                    <div className="font-mono text-xs text-fg-subtle">{ticket.hardware.inventoryNumber}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {ticket.resolution && (
            <Card>
              <CardHeader title="Решение" icon={<CircleCheck className="h-4 w-4" />} badge={<EnumBadge map={TICKET_STATUS} value={ticket.status} />} />
              <p className="whitespace-pre-wrap px-6 py-5 text-[15px] leading-relaxed text-fg-muted">{ticket.resolution}</p>
            </Card>
          )}

          {(purchases.length > 0 || has("request_purchase")) && (
            <Card>
              <CardHeader
                title={`Закупки (${purchases.length})`}
                icon={<ShoppingCart className="h-4 w-4" />}
                actions={
                  has("request_purchase") && (
                    <Button size="icon" onClick={() => setDialog("purchase")} aria-label="Запросить закупку">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )
                }
              />
              {purchases.length === 0 ? (
                <EmptyState title="Закупок по заявке нет" description="Если для ремонта нужны комплектующие — создайте запрос на закупку" />
              ) : (
                <div className="divide-y divide-line">
                  {purchases.map((p) => {
                    const total = p.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                    return (
                      <div key={p.id} className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-fg">Закупка №{p.number}</span>
                          <EnumBadge map={PURCHASE_STATUS} value={p.status} dot />
                          <span className="ml-auto font-bold text-fg">{formatMoney(total)}</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                          {p.items.map((i, idx) => (
                            <li key={idx} className="flex justify-between gap-4">
                              <span>
                                {i.name} × {i.quantity}
                              </span>
                              <span className="tabular-nums">{formatMoney(i.quantity * i.unitPrice)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-fg-subtle">
                          {p.justification} · запросил {p.requestedBy?.shortName} {formatDateTime(p.createdAt)}
                          {p.decidedBy && ` · решение: ${p.decidedBy.shortName} ${formatDateTime(p.decidedAt)}`}
                          {p.decisionComment && ` — «${p.decisionComment}»`}
                        </div>
                        <div className="mt-3 flex gap-2">
                          {canApprove && p.status === "in_progress" && (
                            <>
                              <Button size="sm" variant="success" loading={busy === p.id} onClick={() => purchaseAction(p.id, "approve")}>
                                Одобрить
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => purchaseAction(p.id, "reject")}>
                                Отклонить
                              </Button>
                            </>
                          )}
                          {p.status === "approved" && (canApprove || p.requestedByUserId === session.userId) && (
                            <Button size="sm" loading={busy === p.id} onClick={() => purchaseAction(p.id, "deliver")}>
                              Отметить получение
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Ход работ и обсуждение" icon={<MessageSquare className="h-4 w-4" />} />
            <ol className="px-6 py-5">
              {comments.map((c) => (
                <li key={c.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {c.kind === "system" ? (
                    <>
                      <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-fg-subtle" />
                      </span>
                      <div className="text-sm text-fg-muted">
                        {c.text}
                        <div className="text-xs text-fg-subtle">
                          {c.author?.shortName} · {formatDateTime(c.createdAt)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar name={c.author?.fullName ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1 rounded-xl border border-line bg-muted/40 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 text-xs">
                          <span className="font-semibold text-fg">{c.author?.shortName}</span>
                          <span className="text-fg-subtle">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-fg-muted">{c.text}</p>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
            {has("comment") && (
              <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Написать комментарий…" rows={3} />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} loading={busy === "comment"} onClick={addComment}>
                    Отправить
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="px-6 py-4">
            <h3 className="border-b border-line pb-3 text-lg font-bold text-fg">Детали заявки</h3>
            <div className="divide-y divide-line">
              <DetailRow label="Статус">
                <EnumBadge map={TICKET_STATUS} value={ticket.status} dot />
              </DetailRow>
              <DetailRow label="Приоритет">
                {has("set_priority") ? (
                  <Select
                    value={ticket.priority}
                    onChange={(e) => run("set_priority", { priority: e.target.value }, "Приоритет изменён")}
                    options={enumOptions(TICKET_PRIORITY)}
                  />
                ) : (
                  <EnumBadge map={TICKET_PRIORITY} value={ticket.priority} />
                )}
              </DetailRow>
              <DetailRow label="Заявитель">
                <PersonLine person={ticket.requester} />
              </DetailRow>
              <DetailRow label="Подразделение">{ticket.departmentName}</DetailRow>
              <DetailRow label="Исполнитель">
                {has("assign") ? (
                  <Select
                    value={ticket.assigneeEmployeeId ?? ""}
                    placeholder="Не назначен"
                    onChange={(e) => e.target.value && run("assign", { assigneeEmployeeId: e.target.value }, "Исполнитель назначен")}
                    options={(engineers ?? []).map((e) => ({ value: e.id, label: e.fullName }))}
                  />
                ) : (
                  <PersonLine person={ticket.assignee} />
                )}
              </DetailRow>
              <DetailRow label="Создана">{formatDateTime(ticket.createdAt)}</DetailRow>
              <DetailRow label="Обновлена">{formatDateTime(ticket.updatedAt)}</DetailRow>
              {ticket.resolvedAt && <DetailRow label="Выполнена">{formatDateTime(ticket.resolvedAt)}</DetailRow>}
              {ticket.closedAt && <DetailRow label="Закрыта">{formatDateTime(ticket.closedAt)}</DetailRow>}
              {data.verifiedBy && (
                <DetailRow label="Приёмку выполнил">
                  <PersonLine person={data.verifiedBy} />
                </DetailRow>
              )}
            </div>
          </Card>
          {ticket.status === "resolved" && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-700 dark:text-cyan-300">
              Работы выполнены. Заявка ожидает проверки начальником ИТ-поддержки.
            </div>
          )}
        </div>
      </div>

      <Modal
        open={dialog === "resolve" || dialog === "return" || dialog === "cancel"}
        onClose={() => setDialog(null)}
        title={dialog === "resolve" ? "Завершение работ" : dialog === "return" ? "Возврат на доработку" : "Отмена заявки"}
        description={
          dialog === "resolve"
            ? "После отметки заявка уйдёт на проверку руководителю ИТ-поддержки"
            : dialog === "return"
              ? "Опишите, что необходимо доработать"
              : "Укажите причину отмены (необязательно)"
        }
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Закрыть</Button>
            <Button
              variant={dialog === "cancel" ? "danger" : "primary"}
              loading={busy !== null}
              onClick={() =>
                dialog === "resolve"
                  ? run("resolve", { resolution: dialogText }, "Заявка передана на проверку")
                  : dialog === "return"
                    ? run("return", { comment: dialogText }, "Заявка возвращена исполнителю")
                    : run("cancel", { comment: dialogText }, "Заявка отменена")
              }
            >
              {dialog === "resolve" ? "Передать на проверку" : dialog === "return" ? "Вернуть" : "Отменить заявку"}
            </Button>
          </>
        }
      >
        <Field label={dialog === "resolve" ? "Описание выполненных работ" : "Комментарий"} required={dialog !== "cancel"}>
          <Textarea value={dialogText} onChange={(e) => setDialogText(e.target.value)} rows={5} />
        </Field>
      </Modal>

      <PurchaseDialog
        open={dialog === "purchase"}
        ticketId={ticket.id}
        onClose={() => setDialog(null)}
        onCreated={async () => {
          setDialog(null);
          const v = await apiFetch<TicketView>(`/api/tickets/${id}`);
          mutate(() => v);
        }}
      />
    </>
  );
}

function PurchaseDialog({ open, ticketId, onClose, onCreated }: { open: boolean; ticketId: string; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState([{ name: "", quantity: "1", unitPrice: "" }]);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);
  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/purchases", {
        body: { ticketId, justification, items: items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) },
      });
      toast.success("Запрос на закупку отправлен на согласование");
      setItems([{ name: "", quantity: "1", unitPrice: "" }]);
      setJustification("");
      onCreated();
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
      title="Запрос на закупку комплектующих"
      description="Запрос будет направлен на согласование начальнику ИТ-поддержки. Заявка перейдёт в статус «Ожидает закупки»."
      footer={
        <>
          <span className="mr-auto self-center text-sm text-fg-muted">
            Итого: <b className="text-fg">{formatMoney(total)}</b>
          </span>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            Отправить на согласование
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_90px_130px_40px] items-end gap-2">
            <Field label={idx === 0 ? "Наименование" : ""}>
              <Input value={item.name} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} placeholder="Напр., SSD 512 ГБ" />
            </Field>
            <Field label={idx === 0 ? "Кол-во" : ""}>
              <Input type="number" min={1} value={item.quantity} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
            </Field>
            <Field label={idx === 0 ? "Цена, BYN" : ""}>
              <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)))} />
            </Field>
            <Button size="icon" variant="ghost" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Удалить позицию">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="self-start" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setItems([...items, { name: "", quantity: "1", unitPrice: "" }])}>
          Добавить позицию
        </Button>
        <Field label="Обоснование" required>
          <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} placeholder="Зачем нужна закупка" />
        </Field>
      </div>
    </Modal>
  );
}
