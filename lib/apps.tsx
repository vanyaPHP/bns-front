import {
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  FileText,
  Headset,
  HardDrive,
  House,
  KanbanSquare,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Monitor,
  Network,
  Palmtree,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { ClientSession } from "./types";

export type ShellAppCode = "home" | "admin" | "hr" | "it" | "vacation";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string[];
  visible?: (s: ClientSession) => boolean;
  exact?: boolean;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface AppDef {
  code: ShellAppCode;
  name: string;
  description: string;
  group: string;
  icon: LucideIcon;
  /** Tailwind classes for the coloured icon tile. */
  color: string;
  basePath: string;
  accessPermission?: string;
  badge?: string;
  primaryAction?: { label: string; href: string; permission?: string[] };
  nav: NavSection[];
}

export const APPS: AppDef[] = [
  {
    code: "home",
    name: "Главная",
    description: "Рабочий стол сотрудника",
    group: "Портал",
    icon: House,
    color: "bg-blue-500/15 text-blue-500 dark:text-blue-400",
    basePath: "/",
    nav: [
      {
        title: "Портал",
        items: [
          { label: "Приложения", href: "/", icon: LayoutGrid, exact: true },
          { label: "Мои заявки в ИТ", href: "/my/tickets", icon: Ticket },
          { label: "Моё оборудование", href: "/my/hardware", icon: Monitor },
        ],
      },
    ],
  },
  {
    code: "admin",
    name: "Администрирование",
    description: "Пользователи, роли и права доступа",
    group: "Система",
    icon: ShieldCheck,
    color: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
    basePath: "/admin",
    accessPermission: "admin.access",
    primaryAction: { label: "Новый пользователь", href: "/admin/users?create=1", permission: ["admin.users.manage"] },
    nav: [
      {
        title: "Управление",
        items: [
          { label: "Дашборд", href: "/admin", icon: LayoutGrid, exact: true },
          { label: "Пользователи", href: "/admin/users", icon: Users, permission: ["admin.users.view"] },
          { label: "Роли", href: "/admin/roles", icon: BadgeCheck, permission: ["admin.roles.view"] },
          { label: "Права доступа", href: "/admin/permissions", icon: KeyRound, permission: ["admin.roles.view"] },
        ],
      },
      {
        title: "Система",
        items: [{ label: "Журнал аудита", href: "/admin/audit", icon: FileClock, permission: ["admin.audit.view"] }],
      },
    ],
  },
  {
    code: "hr",
    name: "Персонал",
    description: "Кадровый учёт, документы и оргструктура",
    group: "Персонал",
    icon: UsersRound,
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    basePath: "/hr",
    accessPermission: "hr.access",
    primaryAction: { label: "Принять сотрудника", href: "/hr/employees/new", permission: ["hr.employees.create"] },
    nav: [
      {
        title: "Кадры",
        items: [
          { label: "Дашборд", href: "/hr", icon: LayoutGrid, exact: true },
          { label: "Сотрудники", href: "/hr/employees", icon: Users, permission: ["hr.employees.view"] },
          { label: "Документы", href: "/hr/documents", icon: FileText, permission: ["hr.employees.view"] },
        ],
      },
      {
        title: "Организация",
        items: [{ label: "Оргструктура", href: "/hr/departments", icon: Network, permission: ["hr.departments.view"] }],
      },
      {
        title: "Система",
        items: [{ label: "Журнал аудита", href: "/hr/audit", icon: FileClock, permission: ["hr.audit.view"] }],
      },
    ],
  },
  {
    code: "it",
    name: "ИТ-поддержка",
    description: "Заявки, закупки и учёт оборудования",
    group: "Поддержка",
    icon: Headset,
    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    basePath: "/it",
    accessPermission: "it.access",
    nav: [
      {
        title: "Заявки",
        items: [
          { label: "Дашборд", href: "/it", icon: LayoutGrid, exact: true },
          { label: "Доска заявок", href: "/it/board", icon: KanbanSquare, permission: ["it.tickets.view"] },
          { label: "Список заявок", href: "/it/tickets", icon: ListChecks, permission: ["it.tickets.view"] },
          { label: "На проверке", href: "/it/verification", icon: ClipboardCheck, permission: ["it.tickets.verify"] },
        ],
      },
      {
        title: "Ресурсы",
        items: [
          { label: "Закупки", href: "/it/purchases", icon: ShoppingCart, permission: ["it.purchases.request", "it.purchases.approve"] },
          { label: "Оборудование", href: "/it/hardware", icon: HardDrive, permission: ["it.hardware.view", "it.hardware.manage"] },
        ],
      },
      {
        title: "Система",
        items: [{ label: "Журнал аудита", href: "/it/audit", icon: FileClock, permission: ["it.audit.view"] }],
      },
    ],
  },
  {
    code: "vacation",
    name: "Отпуска",
    description: "Отпуска, больничные и согласования",
    group: "Персонал",
    icon: Palmtree,
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    basePath: "/vacation",
    accessPermission: "vacation.access",
    primaryAction: { label: "Новое заявление", href: "/vacation/my?create=1", permission: ["vacation.request"] },
    nav: [
      {
        title: "Отпуска",
        items: [
          { label: "Дашборд", href: "/vacation", icon: LayoutGrid, exact: true },
          { label: "Мои заявления", href: "/vacation/my", icon: ClipboardList, permission: ["vacation.request"] },
          { label: "Согласование", href: "/vacation/approvals", icon: ClipboardCheck, visible: (s) => s.isApprover },
          { label: "Все заявления", href: "/vacation/all", icon: ListChecks, permission: ["vacation.view_all"] },
          { label: "Календарь", href: "/vacation/calendar", icon: CalendarDays },
        ],
      },
      {
        title: "Система",
        items: [{ label: "Журнал аудита", href: "/vacation/audit", icon: FileClock, permission: ["vacation.audit.view"] }],
      },
    ],
  },
];

export function canSeeApp(app: AppDef, s: ClientSession) {
  return !app.accessPermission || s.permissions.includes(app.accessPermission);
}

export function canSeeItem(item: NavItem, s: ClientSession) {
  if (item.permission && !item.permission.some((p) => s.permissions.includes(p))) return false;
  if (item.visible && !item.visible(s)) return false;
  return true;
}

export function appForPath(pathname: string): AppDef {
  const match = APPS.filter((a) => a.basePath !== "/" && (pathname === a.basePath || pathname.startsWith(a.basePath + "/")));
  return match[0] ?? APPS[0];
}
