"use client";

import { Guard } from "@/components/session";
import { TicketList } from "@/components/it/ticket-list";

export default function VerificationPage() {
  return (
    <Guard anyOf={["it.tickets.verify"]}>
      <TicketList title="Заявки на проверке" breadcrumb="На проверке" preset={{ statuses: ["resolved"] }} />
    </Guard>
  );
}
