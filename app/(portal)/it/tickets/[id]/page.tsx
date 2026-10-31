import { TicketDetail } from "@/components/it/ticket-detail";

export default async function ItTicketPage({ params }: PageProps<"/it/tickets/[id]">) {
  const { id } = await params;
  return (
    <TicketDetail
      id={id}
      breadcrumbs={[
        { label: "ИТ-поддержка", href: "/it" },
        { label: "Заявки", href: "/it/tickets" },
      ]}
    />
  );
}
