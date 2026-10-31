"use client";

import { Guard } from "@/components/session";
import { TicketList } from "@/components/it/ticket-list";

export default function TicketsPage() {
  return (
    <Guard anyOf={["it.tickets.view"]}>
      <TicketList title="Список заявок" breadcrumb="Список заявок" />
    </Guard>
  );
}
