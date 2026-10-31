"use client";

import { Guard } from "@/components/session";
import { PageHeader } from "@/components/ui";
import { EmployeeForm } from "@/components/hr/employee-form";

export default function NewEmployeePage() {
  return (
    <Guard anyOf={["hr.employees.create"]}>
      <PageHeader
        breadcrumbs={[
          { label: "Персонал", href: "/hr" },
          { label: "Сотрудники", href: "/hr/employees" },
          { label: "Приём сотрудника" },
        ]}
        title="Приём сотрудника"
        description="Заполните личную карточку. Поля, отмеченные *, обязательны."
      />
      <EmployeeForm />
    </Guard>
  );
}
