"use client";

import { use } from "react";
import { useApi } from "@/lib/api-client";
import type { EmployeeDTO } from "@/lib/types";
import { Guard } from "@/components/session";
import { ErrorBox, PageHeader, Spinner } from "@/components/ui";
import { EmployeeForm } from "@/components/hr/employee-form";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useApi<EmployeeDTO>(`/api/hr/employees/${id}`);
  return (
    <Guard anyOf={["hr.employees.edit"]}>
      <PageHeader
        breadcrumbs={[
          { label: "Персонал", href: "/hr" },
          { label: "Сотрудники", href: "/hr/employees" },
          { label: data?.fullName ?? "…", href: `/hr/employees/${id}` },
          { label: "Редактирование" },
        ]}
        title="Редактирование карточки"
      />
      {error ? <ErrorBox message={error} /> : data ? <EmployeeForm employee={data} /> : <Spinner />}
    </Guard>
  );
}
