import { TicketDetail } from "@/components/it/ticket-detail";

export default async function MyTicketPage({ params }: PageProps<"/my/tickets/[id]">) {
  const { id } = await params;
  return (
    <TicketDetail
      id={id}
      breadcrumbs={[
        { label: "Главная", href: "/" },
        { label: "Мои заявки в ИТ", href: "/my/tickets" },
      ]}
    />
  );
}
