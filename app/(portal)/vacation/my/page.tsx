"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus } from "lucide-react";
import { useApi } from "@/lib/api-client";
import type { LeaveDTO } from "@/lib/types";
import { Guard } from "@/components/session";
import { Button, PageHeader } from "@/components/ui";
import { CreateLeaveModal } from "@/components/vacation/create-leave-modal";
import { LeaveTable } from "@/components/vacation/leave-table";

export default function MyLeavePage() {
  return (
    <Guard anyOf={["vacation.request"]}>
      <Suspense>
        <MyLeave />
      </Suspense>
    </Guard>
  );
}

function MyLeave() {
  const params = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(params.get("create") === "1");
  const { data, loading, reload } = useApi<LeaveDTO[]>("/api/leave?scope=my");
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Отпуска", href: "/vacation" }, { label: "Мои заявления" }]}
        title="Мои заявления"
        description="Отпуска, больничные и отпуска без сохранения заработной платы"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Новое заявление
          </Button>
        }
      />
      <LeaveTable rows={data} loading={loading} emptyTitle="Вы ещё не подавали заявлений" />
      <CreateLeaveModal
        open={creating}
        onClose={() => {
          setCreating(false);
          if (params.get("create")) router.replace("/vacation/my");
        }}
        onCreated={reload}
      />
    </>
  );
}
